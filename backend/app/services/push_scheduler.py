from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from sqlalchemy.orm import aliased
from sqlalchemy import exists, and_

from app.models.jogo import Jogo
from app.models.liga import Liga
from app.models.time import Time
from app.models.liga_membro import LigaMembro
from app.models.palpite import Palpite
from app.models.push_token import PushToken
from app.models.push_alert_log import PushAlertLog
from app.services.push_sender import send_to_token

from firebase_admin._messaging_utils import UnregisteredError
import logging

logger = logging.getLogger(__name__)



TZ = ZoneInfo("America/Sao_Paulo")

# minutos antes do jogo
ALERT_OFFSETS_MIN = [480, 240, 120, 60, 30, 15, 10, 5, 2, 1]  # 8h, 4h, 2h, 1h, 30m, 15m, 10m, 5m, 2m, 1m


def to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _format_offset(minutes: int) -> str:
    if minutes >= 60:
        h = minutes // 60
        return f"{h}h"
    return f"{minutes} min"


def run_missing_bet_alerts(db: Session):
    dialect = db.get_bind().dialect.name
    now_local = datetime.now(TZ)
    now_utc = now_local.astimezone(timezone.utc)

    try:
        for offset in ALERT_OFFSETS_MIN:
            alert_type = f"PRE_{offset}"

            if dialect == "sqlite":
                start_local = now_local + timedelta(minutes=offset)
                end_local = now_local + timedelta(minutes=offset + 1)
                start_cmp = start_local.replace(tzinfo=None)
                end_cmp = end_local.replace(tzinfo=None)
            else:
                start_cmp = now_utc + timedelta(minutes=offset)
                end_cmp = now_utc + timedelta(minutes=offset + 1)

            jogos = (
                db.query(Jogo)
                .filter(
                    Jogo.status == "agendado",
                    Jogo.data_hora.isnot(None),
                    Jogo.data_hora >= start_cmp,
                    Jogo.data_hora < end_cmp,
                )
                .all()
            )

            for jogo in jogos:
                ligas = db.query(Liga).filter(Liga.temporada_id == jogo.temporada_id).all()
                if not ligas:
                    continue

                for liga in ligas:
                    already = (
                        db.query(PushAlertLog)
                        .filter(
                            PushAlertLog.jogo_id == jogo.id,
                            PushAlertLog.liga_id == liga.id,
                            PushAlertLog.alert_type == alert_type,
                        )
                        .first()
                    )
                    if already:
                        continue

                    missing_users = (
                        db.query(LigaMembro.usuario_id)
                        .filter(LigaMembro.liga_id == liga.id)
                        .filter(
                            ~exists().where(
                                and_(
                                    Palpite.liga_id == liga.id,
                                    Palpite.jogo_id == jogo.id,
                                    Palpite.usuario_id == LigaMembro.usuario_id,
                                )
                            )
                        )
                        .all()
                    )
                    user_ids = [r[0] for r in missing_users]

                    if not user_ids:
                        db.add(PushAlertLog(jogo_id=jogo.id, liga_id=liga.id, alert_type=alert_type))
                        continue  # ✅ sem commit aqui, acumula e commita no final

                    tokens = (
                        db.query(PushToken)
                        .filter(PushToken.user_id.in_(user_ids), PushToken.is_active.is_(True))
                        .all()
                    )

                    offset_txt = _format_offset(offset)
                    jogo_dt = jogo.data_hora

                    if jogo_dt is not None:
                        if dialect == "sqlite":
                            jogo_dt_sp = jogo_dt.replace(tzinfo=TZ)
                        else:
                            jogo_dt_sp = to_utc(jogo_dt).astimezone(TZ)

                        mandante = aliased(Time)
                        visitante = aliased(Time)

                        row = (
                            db.query(Jogo, mandante.nome.label("mandante_nome"), visitante.nome.label("visitante_nome"))
                            .join(mandante, mandante.id == Jogo.time_casa_id)
                            .join(visitante, visitante.id == Jogo.time_fora_id)
                            .filter(Jogo.id == jogo.id)
                            .first()
                        )
                        jogo_obj, mandante_nome, visitante_nome = row
                        body = f"Faltam {offset_txt} pro jogo {mandante_nome} x {visitante_nome}. Envie seu palpite!"
                    else:
                        body = f"Faltam {offset_txt} pro jogo. Envie seu palpite!"

                    title = "Palpite pendente 👀"

                    for t in tokens:
                        try:
                            send_to_token(
                                t.token, title, body,
                                {
                                    "kind": "missing_bet",
                                    "jogo_id": str(jogo.id),
                                    "liga_id": str(liga.id),
                                    "offset_min": str(offset),
                                },
                            )
                        except UnregisteredError:
                            t.is_active = False
                        except Exception as e:
                            logger.exception(
                                "Falha ao enviar push (mantendo token ativo)",
                                extra={
                                    "user_id": getattr(t, "user_id", None),
                                    "push_token_id": getattr(t, "id", None),
                                    "jogo_id": jogo.id,
                                    "liga_id": liga.id,
                                    "alert_type": alert_type,
                                },
                            )

                    db.add(PushAlertLog(jogo_id=jogo.id, liga_id=liga.id, alert_type=alert_type))

        # ✅ Um único commit no final de tudo
        db.commit()

    except Exception:
        db.rollback()  # ✅ Garante limpeza se algo explodir no meio
        raise
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from sqlalchemy import exists, and_

from app.models.jogo import Jogo
from app.models.liga import Liga
from app.models.liga_membro import LigaMembro
from app.models.palpite import Palpite
from app.models.push_token import PushToken
from app.models.push_alert_log import PushAlertLog
from app.services.push_sender import send_to_token

TZ = ZoneInfo("America/Sao_Paulo")

# minutos antes do jogo
ALERT_OFFSETS_MIN = [480, 240, 120, 60, 30, 15, 10, 5, 2, 1]  # 8h, 4h, 2h, 1h, 30m, 15m, 10m, 5m, 2m, 1m

def _format_offset(minutes: int) -> str:
    if minutes >= 60:
        h = minutes // 60
        return f"{h}h"
    return f"{minutes}min"

def run_missing_bet_alerts(db: Session):
    # Como Jogo.data_hora é naive, comparamos com hora local SP e removemos tzinfo
    now_local = datetime.now(TZ)

    for offset in ALERT_OFFSETS_MIN:
        start_local = now_local + timedelta(minutes=offset)
        end_local = now_local + timedelta(minutes=offset + 1)

        start_naive = start_local.replace(tzinfo=None)
        end_naive = end_local.replace(tzinfo=None)

        alert_type = f"PRE_{offset}"

        jogos = (
            db.query(Jogo)
            .filter(
                Jogo.status == "agendado",
                Jogo.data_hora != None,  # noqa
                Jogo.data_hora >= start_naive,
                Jogo.data_hora < end_naive,
            )
            .all()
        )

        for jogo in jogos:
            ligas = db.query(Liga).filter(Liga.temporada_id == jogo.temporada_id).all()
            if not ligas:
                continue

            for liga in ligas:
                # log por (jogo, liga, tipo)
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

                # usuários da liga que NÃO têm palpite para esse jogo nessa liga
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

                # mesmo que ninguém esteja pendente, registramos log (pra não ficar checando e enviando “nada”)
                # (opcional: você pode pular o log nesse caso)
                if not user_ids:
                    db.add(PushAlertLog(jogo_id=jogo.id, liga_id=liga.id, alert_type=alert_type))
                    db.commit()
                    continue

                tokens = (
                    db.query(PushToken)
                    .filter(PushToken.user_id.in_(user_ids), PushToken.is_active == True)  # noqa
                    .all()
                )

                # monta mensagem (ajuste se tiver campos/relacionamentos para times)
                offset_txt = _format_offset(offset)
                title = "Palpite pendente 👀"
                body = f"Faltam {offset_txt} pro jogo. Envie seu palpite!"

                for t in tokens:
                    try:
                        send_to_token(
                            t.token,
                            title,
                            body,
                            {"kind": "missing_bet", "jogo_id": str(jogo.id), "liga_id": str(liga.id), "offset_min": str(offset)},
                        )
                    except Exception:
                        t.is_active = False

                db.add(PushAlertLog(jogo_id=jogo.id, liga_id=liga.id, alert_type=alert_type))
                db.commit()

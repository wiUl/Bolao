"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { listarMinhasLigas } from "@/app/api/ligas";
import { listarJogos } from "@/app/api/jogos";
import {
  listarMeusPalpitesNaRodada,
  upsertMeuPalpite,
  deletarMeuPalpite,
} from "@/app/api/palpites";

import type { Liga } from "@/app/types/liga";
import type { Jogo } from "@/app/types/jogo";
import type { MeuPalpiteRodadaItem } from "@/app/types/palpite";
import { formatDateTimeSP } from "@/app/utils/datetime";

type FormState = {
  palpite_casa: string; // controla input
  palpite_fora: string;
  saving?: boolean;
};

type ToastType = "success" | "error" | "info";
type ToastMessage = {
  type: ToastType;
  title: string;
  message: string;
  show: boolean;
};

export default function PalpitesRodadaPage() {
  const params = useParams();

  // suporte a ambos formatos (ligaId / liga_id), caso seu segmento varie
  const rawLigaId: any = (params as any)?.ligaId ?? (params as any)?.liga_id ?? (params as any)?.id;
  const ligaId = Number(rawLigaId);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (!mounted) return;
    const onResize = () => setMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted]);

  const [liga, setLiga] = useState<Liga | null>(null);
  const [rodada, setRodada] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [meusPalpites, setMeusPalpites] = useState<MeuPalpiteRodadaItem[]>([]);

  const [toast, setToast] = useState<ToastMessage>({
    type: "info",
    title: "",
    message: "",
    show: false
  });

  const [savingAll, setSavingAll] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });

  const meusPalpitesMap = useMemo(() => {
    const m = new Map<number, MeuPalpiteRodadaItem>();
    for (const p of meusPalpites) m.set(p.jogo_id, p);
    return m;
  }, [meusPalpites]);

  const [forms, setForms] = useState<Record<number, FormState>>({});

  const showToast = (type: ToastType, title: string, message: string) => {
    setToast({ type, title, message, show: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // auto-hide de sucesso
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  // 1) Carrega a liga (pra pegar temporada_id)
  useEffect(() => {
    let alive = true;

    async function loadLiga() {
      setErr(null);
      setLoading(true);

      try {
        if (!Number.isFinite(ligaId) || ligaId <= 0) {
          setErr("ligaId inválido.");
          setLiga(null);
          return;
        }

        const minhas = await listarMinhasLigas();
        const found = minhas.find((l) => l.id === ligaId) ?? null;

        if (!alive) return;

        if (!found) {
          setErr("Liga não encontrada ou você não participa dela.");
          setLiga(null);
          return;
        }

        setLiga(found);
      } catch (e: any) {
        if (!alive) return;
        setErr(extractApiErrorMessage(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadLiga();
    return () => {
      alive = false;
    };
  }, [ligaId]);

  // 2) Carrega jogos + meus palpites quando (liga + rodada) estiverem prontos
  useEffect(() => {
    if (!liga) return;

    const ligaAtual = liga; 
    let alive = true;

    async function loadRodada() {
      setErr(null);
      setMsg(null);
      setLoading(true);

      try {
        const [listaJogos, listaPalpites] = await Promise.all([
          listarJogos({ temporada_id: ligaAtual.temporada_id, rodada }),
          listarMeusPalpitesNaRodada(ligaAtual.id, rodada),
        ]);

        if (!alive) return;

        setJogos(listaJogos);
        setMeusPalpites(listaPalpites);

        // Inicializa inputs com os palpites existentes
        const nextForms: Record<number, FormState> = {};
        for (const j of listaJogos) {
          const p = listaPalpites.find((x) => x.jogo_id === j.id);
          nextForms[j.id] = {
            palpite_casa: p?.palpite_casa != null ? String(p.palpite_casa) : "",
            palpite_fora: p?.palpite_fora != null ? String(p.palpite_fora) : "",
          };
        }
        setForms(nextForms);
      } catch (e: any) {
        if (!alive) return;
        setErr(extractApiErrorMessage(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadRodada();
    return () => {
      alive = false;
    };
  }, [liga, rodada]);

  function setFormValue(jogoId: number, key: "palpite_casa" | "palpite_fora", value: string) {
    setForms((prev) => ({
      ...prev,
      [jogoId]: {
        ...(prev[jogoId] ?? { palpite_casa: "", palpite_fora: "" }),
        [key]: value,
      },
    }));
  }

  function isFinalizado(status: string) {
    const s = (status || "").toLowerCase();
    return s.includes("final") || s.includes("encerr") || s === "finalizado";
  }

  async function handleSalvar(jogoId: number) {
    setErr(null);
    setMsg(null);

    const f = forms[jogoId];
    if (!f) return;

    const casaStr = f.palpite_casa.trim();
    const foraStr = f.palpite_fora.trim();

    if (casaStr === "" || foraStr === "") {
      setErr("Preencha os dois placares para salvar o palpite.");
      return;
    }

    const casa = Number(casaStr);
    const fora = Number(foraStr);

    if (!Number.isInteger(casa) || !Number.isInteger(fora)) {
      setErr("Os placares precisam ser números inteiros.");
      return;
    }
    if (casa < 0 || fora < 0 || casa > 20 || fora > 20) {
      setErr("Placares devem estar entre 0 e 20.");
      return;
    }

    setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: true } }));

    try {
      await upsertMeuPalpite(ligaId, jogoId, { placar_casa: casa, placar_fora: fora });
      setMsg("Palpite salvo.");

      const lista = await listarMeusPalpitesNaRodada(ligaId, rodada);
      setMeusPalpites(lista);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: false } }));
    }
  }

  async function handleSalvarTodos() {
    setErr(null);
    
    // Validar todos os forms primeiro
    const palpitesParaSalvar: Array<{ jogoId: number; casa: number; fora: number }> = [];
    
    for (const jogo of jogos) {
      // Pular jogos finalizados
      if (isFinalizado(jogo.status)) continue;
      
      const f = forms[jogo.id];
      if (!f) continue;

      const casaStr = f.palpite_casa.trim();
      const foraStr = f.palpite_fora.trim();

      // Pular se estiver vazio (usuário não quer palpitar esse jogo)
      if (casaStr === "" && foraStr === "") continue;

      // Validar se um está preenchido e o outro não
      if (casaStr === "" || foraStr === "") {
        showToast("error", "Erro de Validação", 
          `Jogo ${jogo.time_casa.sigla} x ${jogo.time_fora.sigla}: preencha ambos os placares ou deixe ambos em branco.`);
        return;
      }

      const casa = Number(casaStr);
      const fora = Number(foraStr);

      if (!Number.isInteger(casa) || !Number.isInteger(fora)) {
        showToast("error", "Erro de Validação", 
          `Jogo ${jogo.time_casa.sigla} x ${jogo.time_fora.sigla}: os placares precisam ser números inteiros.`);
        return;
      }

      if (casa < 0 || fora < 0 || casa > 20 || fora > 20) {
        showToast("error", "Erro de Validação", 
          `Jogo ${jogo.time_casa.sigla} x ${jogo.time_fora.sigla}: placares devem estar entre 0 e 20.`);
        return;
      }

      palpitesParaSalvar.push({ jogoId: jogo.id, casa, fora });
    }

    if (palpitesParaSalvar.length === 0) {
      showToast("info", "Nenhum palpite", "Não há palpites novos para salvar.");
      return;
    }

    // Confirmar ação
    const confirmMsg = `Você está prestes a salvar ${palpitesParaSalvar.length} palpite(s). Deseja continuar?`;
    if (!window.confirm(confirmMsg)) return;

    // Salvar sequencialmente
    setSavingAll(true);
    setSaveProgress({ current: 0, total: palpitesParaSalvar.length });

    let sucessos = 0;
    let erros = 0;

    for (let i = 0; i < palpitesParaSalvar.length; i++) {
      const { jogoId, casa, fora } = palpitesParaSalvar[i];
      
      setSaveProgress({ current: i + 1, total: palpitesParaSalvar.length });

      try {
        await upsertMeuPalpite(ligaId, jogoId, { placar_casa: casa, placar_fora: fora });
        sucessos++;
      } catch (e: any) {
        erros++;
        console.error(`Erro ao salvar palpite do jogo ${jogoId}:`, e);
      }
    }

    setSavingAll(false);
    setSaveProgress({ current: 0, total: 0 });

    // Recarregar palpites
    try {
      const lista = await listarMeusPalpitesNaRodada(ligaId, rodada);
      setMeusPalpites(lista);
    } catch (e) {
      console.error("Erro ao recarregar palpites:", e);
    }

    // Mostrar resultado
    if (erros === 0) {
      showToast("success", "Todos salvos!", `${sucessos} palpite(s) salvos com sucesso! 🎉`);
    } else if (sucessos > 0) {
      showToast("info", "Parcialmente salvo", `${sucessos} salvos, ${erros} com erro. Verifique os palpites.`);
    } else {
      showToast("error", "Erro ao salvar", `Não foi possível salvar nenhum palpite. Tente novamente.`);
    }
  }

  async function handleDeletar(jogoId: number) {
    setErr(null);
    setMsg(null);

    const ok = window.confirm("Deseja remover seu palpite deste jogo?");
    if (!ok) return;

    setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: true } }));

    try {
      await deletarMeuPalpite(ligaId, jogoId);
      setMsg("Palpite removido.");

      setForms((prev) => ({
        ...prev,
        [jogoId]: {
          ...(prev[jogoId] ?? { palpite_casa: "", palpite_fora: "" }),
          palpite_casa: "",
          palpite_fora: "",
          saving: false,
        },
      }));

      const lista = await listarMeusPalpitesNaRodada(ligaId, rodada);
      setMeusPalpites(lista);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
      setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: false } }));
    }
  }

  const palpitesPreenchidos = useMemo(() => {
    return jogos.filter(jogo => {
      if (isFinalizado(jogo.status)) return false;
      const f = forms[jogo.id];
      return f && f.palpite_casa.trim() !== "" && f.palpite_fora.trim() !== "";
    }).length;
  }, [jogos, forms]);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      {/* Pop-up Toast */}
      {toast.show && (
        <div style={toastContainerStyle}>
          <div style={toastStyle(toast.type)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  {getToastIcon(toast.type)} {toast.title}
                </div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>
                  {toast.message}
                </div>
              </div>
              <button
                onClick={() => setToast(prev => ({ ...prev, show: false }))}
                style={closeButtonStyle}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ marginTop: 0, marginBottom: 0, fontWeight: 600 }}>
            Palpites — Rodada {rodada}
          </h1>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href={`/app/ligas/${ligaId}`} style={{ textDecoration: "none", fontWeight: 600 }}>
              Voltar
            </Link>
          </div>
        </div>

        <p style={{ marginTop: 8, marginBottom: 0 }}>
          {liga ? (
            <>
              Liga: <strong>{liga.nome}</strong> — Temporada #{liga.temporada_id}
            </>
          ) : (
            "Carregando liga..."
          )}
        </p>
      </section>

      {err ? (
        <div style={alertStyle("error")}>
          <strong>Erro:</strong> {err}
        </div>
      ) : null}

      {msg ? (
        <div style={alertStyle("success")} role="status" aria-live="polite">
          <strong>Ok:</strong> {msg}
        </div>
      ) : null}

      {/* Seletor de rodada */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Rodada</h2>

        {/* Botão Salvar Todos */}
          <button
            type="button"
            onClick={handleSalvarTodos}
            disabled={savingAll || loading || palpitesPreenchidos === 0}
            style={saveAllButtonStyle(savingAll)}
            title={palpitesPreenchidos === 0 ? "Preencha ao menos um palpite" : `Salvar ${palpitesPreenchidos} palpite(s)`}
          >
            {savingAll ? (
              <>
                💾 Salvando {saveProgress.current}/{saveProgress.total}...
              </>
            ) : (
              <>
                💾 Salvar Todos ({palpitesPreenchidos})
              </>
            )}
          </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            style={secondaryBtnStyle}
            onClick={() => setRodada((r) => Math.max(1, r - 1))}
            disabled={rodada <= 1 || loading}
          >
            ← Anterior
          </button>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Número:</span>
            <input
              type="number"
              value={rodada}
              onChange={(e) => setRodada(Math.max(1, Number(e.target.value)))}
              min={1}
              style={{ ...inputStyle, width: 120 }}
              disabled={loading}
            />
          </label>

          <button type="button" style={secondaryBtnStyle} onClick={() => setRodada((r) => r + 1)} disabled={loading}>
            Próxima →
          </button>
        </div>
      </section>

      {/* Lista de jogos */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ marginTop: 0, fontWeight: 600 }}>Jogos</h2>
          {loading ? <span style={{ fontSize: 14, opacity: 0.8 }}>Carregando...</span> : null}
        </div>

        {!loading && jogos.length === 0 ? <p>Nenhum jogo encontrado para essa rodada.</p> : null}

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {jogos.map((j) => {
            const f = forms[j.id] ?? { palpite_casa: "", palpite_fora: "" };
            const p = meusPalpitesMap.get(j.id) ?? null;

            const finalizado = isFinalizado(j.status);
            const disabled = finalizado || !!f.saving;

            return (
              <div key={j.id} style={gameCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>
                      {j.time_casa.nome} x {j.time_fora.nome}
                    </strong>
                    <div style={{ fontSize: 14, opacity: 0.85 }}>
                      {formatDateTimeSP(j.data_hora)} • Status: <code>{j.status}</code>
                    </div>
                  </div>

                  {p?.pontos != null ? (
                    <div style={{ fontSize: 14 }}>
                      Pontos: <strong>{p.pontos}</strong>
                    </div>
                  ) : null}
                </div>

                {/* Aqui está o layout de inputs + botões */}
                <div style={{ marginTop: 12, width: "100%" }}>
                  {/* Para evitar React #418, só decide mobile/desktop depois de mounted */}
                  {mounted && mobile ? (
                    <MobilePlacar
                      j={j}
                      f={f}
                      p={p}
                      disabled={disabled}
                      finalizado={finalizado}
                      onChangeCasa={(v) => setFormValue(j.id, "palpite_casa", v)}
                      onChangeFora={(v) => setFormValue(j.id, "palpite_fora", v)}
                      onSalvar={() => handleSalvar(j.id)}
                      onRemover={() => handleDeletar(j.id)}
                    />
                  ) : (
                    <DesktopPlacar
                      j={j}
                      f={f}
                      p={p}
                      disabled={disabled}
                      finalizado={finalizado}
                      onChangeCasa={(v) => setFormValue(j.id, "palpite_casa", v)}
                      onChangeFora={(v) => setFormValue(j.id, "palpite_fora", v)}
                      onSalvar={() => handleSalvar(j.id)}
                      onRemover={() => handleDeletar(j.id)}
                    />
                  )}
                </div>

                {p && (p.placar_real_casa != null || p.placar_real_fora != null) ? (
                  <div style={{ marginTop: 10, fontSize: 14, opacity: 0.9 }}>
                    Placar real:{" "}
                    <strong>
                      {p.placar_real_casa ?? "—"} x {p.placar_real_fora ?? "—"}
                    </strong>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

/* ----------------------------- Subcomponentes ----------------------------- */

function MobilePlacar(props: {
  j: Jogo;
  f: FormState;
  p: MeuPalpiteRodadaItem | null;
  disabled: boolean;
  finalizado: boolean;
  onChangeCasa: (v: string) => void;
  onChangeFora: (v: string) => void;
  onSalvar: () => void;
  onRemover: () => void;
}) {
  const { j, f, p, disabled, finalizado, onChangeCasa, onChangeFora, onSalvar, onRemover } = props;

  return (
    <div style={{ display: "grid", gap: 12, width: "100%" }}>
      {/* Placar em 2 colunas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
        {/* CASA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src={getEscudoSrc(j.time_casa.sigla)}
              alt={`Escudo ${j.time_casa.nome}`}
              style={{ width: 28, height: 28, objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <strong>{j.time_casa.sigla}</strong>
          </div>

          <input
            type="number"
            min={0}
            max={20}
            value={f.palpite_casa}
            onChange={(e) => onChangeCasa(e.target.value)}
            style={{ ...inputStyle, width: "100%", textAlign: "center" }}
            disabled={disabled}
            placeholder="Casa"
          />
        </div>

        {/* FORA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
            <strong>{j.time_fora.sigla}</strong>
            <img
              src={getEscudoSrc(j.time_fora.sigla)}
              alt={`Escudo ${j.time_fora.nome}`}
              style={{ width: 28, height: 28, objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <input
            type="number"
            min={0}
            max={20}
            value={f.palpite_fora}
            onChange={(e) => onChangeFora(e.target.value)}
            style={{ ...inputStyle, width: "100%", textAlign: "center" }}
            disabled={disabled}
            placeholder="Fora"
          />
        </div>
      </div>

      {/* Botões */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
        <button
          type="button"
          onClick={onSalvar}
          style={primaryBtnStyle(!!f.saving)}
          disabled={disabled}
          title={finalizado ? "Jogo finalizado (edição bloqueada)" : ""}
        >
          {f.saving ? "Salvando..." : "Salvar"}
        </button>

        <button
          type="button"
          onClick={onRemover}
          style={dangerBtnStyle}
          disabled={disabled || (p?.palpite_casa == null && p?.palpite_fora == null)}
          title={finalizado ? "Jogo finalizado (edição bloqueada)" : ""}
        >
          Remover
        </button>
      </div>
    </div>
  );
}

function DesktopPlacar(props: {
  j: Jogo;
  f: FormState;
  p: MeuPalpiteRodadaItem | null;
  disabled: boolean;
  finalizado: boolean;
  onChangeCasa: (v: string) => void;
  onChangeFora: (v: string) => void;
  onSalvar: () => void;
  onRemover: () => void;
}) {
  const { j, f, p, disabled, finalizado, onChangeCasa, onChangeFora, onSalvar, onRemover } = props;

  return (
    <div style={scoreRowStyle}>
      {/* Casa */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong style={{ width: 42 }}>{j.time_casa.sigla}</strong>

        <img
          src={getEscudoSrc(j.time_casa.sigla)}
          alt={`Escudo ${j.time_casa.nome}`}
          style={{ width: 28, height: 28, objectFit: "contain" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Inputs */}
      <input
        type="number"
        min={0}
        max={20}
        value={f.palpite_casa}
        onChange={(e) => onChangeCasa(e.target.value)}
        style={{ ...inputStyle, width: 80, textAlign: "center" }}
        disabled={disabled}
        placeholder="Casa"
      />

      <span style={{ fontWeight: 800 }}>x</span>

      <input
        type="number"
        min={0}
        max={20}
        value={f.palpite_fora}
        onChange={(e) => onChangeFora(e.target.value)}
        style={{ ...inputStyle, width: 80, textAlign: "center" }}
        disabled={disabled}
        placeholder="Fora"
      />

      {/* Fora */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img
          src={getEscudoSrc(j.time_fora.sigla)}
          alt={`Escudo ${j.time_fora.nome}`}
          style={{ width: 28, height: 28, objectFit: "contain" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <strong style={{ width: 42, textAlign: "right" }}>{j.time_fora.sigla}</strong>
      </div>

      {/* Botões */}
      <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
        <button
          type="button"
          onClick={onSalvar}
          style={primaryBtnStyle(!!f.saving)}
          disabled={disabled}
          title={finalizado ? "Jogo finalizado (edição bloqueada)" : ""}
        >
          {f.saving ? "Salvando..." : "Salvar"}
        </button>

        <button
          type="button"
          onClick={onRemover}
          style={dangerBtnStyle}
          disabled={disabled || (p?.palpite_casa == null && p?.palpite_fora == null)}
          title={finalizado ? "Jogo finalizado (edição bloqueada)" : ""}
        >
          Remover
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Utils + styles ----------------------------- */

function getEscudoSrc(sigla: string | null | undefined): string {
  if (!sigla) return "/escudos/default.png";
  return `/escudos/${sigla.toUpperCase()}.png`; // bate com FLU.png etc na Vercel
}

/** Evita "[object Object]" com FastAPI */
function extractApiErrorMessage(e: any): string {
  const data = e?.response?.data;
  const detail = data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const msgs = detail
      .map((x) => (typeof x?.msg === "string" ? x.msg : null))
      .filter(Boolean);
    if (msgs.length) return msgs.join(" | ");
    return JSON.stringify(detail);
  }

  if (typeof data?.message === "string") return data.message;
  if (typeof data === "string") return data;
  if (data) return JSON.stringify(data);

  return e?.message || "Erro inesperado.";
}

function getToastIcon(type: ToastType): string {
  switch (type) {
    case "success": return "✅";
    case "error": return "❌";
    case "info": return "ℹ️";
    default: return "📌";
  }
}

function alertStyle(kind: "success" | "error"): React.CSSProperties {
  const base: React.CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  };
  return kind === "success"
    ? { ...base, borderColor: "#b7e3c5" }
    : { ...base, borderColor: "#f3c2c2" };
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 18,
};

const gameCard: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--foreground)",
  outline: "none",
  height: 42, 
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "var(--surface)",
  cursor: "pointer",
};

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: disabled ? "var(--muted)" : "var(--surface)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
  };
}

const dangerBtnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #f3c2c2",
  background: "var(--surface)",
  cursor: "pointer",
  fontWeight: 600,
};

const scoreRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

function saveAllButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "12px 20px",
    borderRadius: 10,
    border: "none",
    background: disabled ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    fontSize: 14,
    boxShadow: disabled ? "none" : "0 4px 12px rgba(102, 126, 234, 0.4)",
    transition: "all 0.3s ease",
    opacity: disabled ? 0.6 : 1,
  };
}


const toastContainerStyle: React.CSSProperties = {
  position: "fixed",
  top: 20,
  right: 20,
  zIndex: 9999,
  maxWidth: "90vw",
  width: 420,
  animation: "slideInRight 0.3s ease-out",
};

function toastStyle(type: ToastType): React.CSSProperties {
  const backgrounds = {
    success: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    error: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    info: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  };

  return {
    background: backgrounds[type],
    color: "white",
    padding: "16px 20px",
    borderRadius: 12,
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.2)",
  };
}

const closeButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: 20,
  cursor: "pointer",
  padding: 4,
  lineHeight: 1,
  opacity: 0.8,
  transition: "opacity 0.2s",
};

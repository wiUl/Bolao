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
  palpite_casa: string;
  palpite_fora: string;
  saving?: boolean;
};

// Tipo para o Pop-up
type ToastType = "success" | "error" | "info";
type ToastMessage = {
  type: ToastType;
  title: string;
  message: string;
  show: boolean;
};

export default function PalpitesRodadaPage() {
  const params = useParams();
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
  
  // Estado para o pop-up de toast
  const [toast, setToast] = useState<ToastMessage>({
    type: "info",
    title: "",
    message: "",
    show: false
  });

  // Estado para salvamento em lote
  const [savingAll, setSavingAll] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });

  // Estado para remoção em lote
  const [removingAll, setRemovingAll] = useState(false);
  const [removeProgress, setRemoveProgress] = useState({ current: 0, total: 0 });

  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [meusPalpites, setMeusPalpites] = useState<MeuPalpiteRodadaItem[]>([]);

  const meusPalpitesMap = useMemo(() => {
    const m = new Map<number, MeuPalpiteRodadaItem>();
    for (const p of meusPalpites) m.set(p.jogo_id, p);
    return m;
  }, [meusPalpites]);

  const [forms, setForms] = useState<Record<number, FormState>>({});

  // Função para mostrar toast
  const showToast = (type: ToastType, title: string, message: string) => {
    setToast({ type, title, message, show: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // 1) Carrega a liga
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

  // 2) Carrega jogos + palpites
  useEffect(() => {
    if (!liga) return;

    const ligaAtual = liga; 
    let alive = true;

    async function loadRodada() {
      setErr(null);
      setLoading(true);

      try {
        const [listaJogos, listaPalpites] = await Promise.all([
          listarJogos({ temporada_id: ligaAtual.temporada_id, rodada }),
          listarMeusPalpitesNaRodada(ligaAtual.id, rodada),
        ]);

        if (!alive) return;

        setJogos(listaJogos);
        setMeusPalpites(listaPalpites);

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

  // Salvar palpite individual
  async function handleSalvar(jogoId: number) {
    setErr(null);

    const f = forms[jogoId];
    if (!f) return;

    const casaStr = f.palpite_casa.trim();
    const foraStr = f.palpite_fora.trim();

    if (casaStr === "" || foraStr === "") {
      showToast("error", "Erro", "Preencha os dois placares para salvar o palpite.");
      return;
    }

    const casa = Number(casaStr);
    const fora = Number(foraStr);

    if (!Number.isInteger(casa) || !Number.isInteger(fora)) {
      showToast("error", "Erro", "Os placares precisam ser números inteiros.");
      return;
    }
    if (casa < 0 || fora < 0 || casa > 20 || fora > 20) {
      showToast("error", "Erro", "Placares devem estar entre 0 e 20.");
      return;
    }

    setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: true } }));

    try {
      await upsertMeuPalpite(ligaId, jogoId, { placar_casa: casa, placar_fora: fora });
      showToast("success", "Sucesso!", "Palpite salvo com sucesso.");

      const lista = await listarMeusPalpitesNaRodada(ligaId, rodada);
      setMeusPalpites(lista);
    } catch (e: any) {
      const errorMsg = extractApiErrorMessage(e);
      setErr(errorMsg);
      showToast("error", "Erro ao salvar", errorMsg);
    } finally {
      setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: false } }));
    }
  }

  // NOVA FUNÇÃO: Salvar todos os palpites
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

  // NOVA FUNÇÃO: Remover todos os palpites
  async function handleRemoverTodos() {
    setErr(null);
    
    // Coletar palpites salvos para remover
    const palpitesParaRemover: number[] = [];
    
    for (const jogo of jogos) {
      // Pular jogos finalizados
      if (isFinalizado(jogo.status)) continue;
      
      const meu = meusPalpitesMap.get(jogo.id);
      // Só adiciona se tiver palpite salvo
      if (meu && meu.palpite_casa != null && meu.palpite_fora != null) {
        palpitesParaRemover.push(jogo.id);
      }
    }

    if (palpitesParaRemover.length === 0) {
      showToast("info", "Nenhum palpite", "Não há palpites salvos para remover.");
      return;
    }

    // Confirmar ação
    const confirmMsg = `Você está prestes a remover ${palpitesParaRemover.length} palpite(s). Esta ação não pode ser desfeita. Deseja continuar?`;
    if (!window.confirm(confirmMsg)) return;

    // Remover sequencialmente
    setRemovingAll(true);
    setRemoveProgress({ current: 0, total: palpitesParaRemover.length });

    let sucessos = 0;
    let erros = 0;

    for (let i = 0; i < palpitesParaRemover.length; i++) {
      const jogoId = palpitesParaRemover[i];
      
      setRemoveProgress({ current: i + 1, total: palpitesParaRemover.length });

      try {
        await deletarMeuPalpite(ligaId, jogoId);
        
        // Limpar formulário
        setForms((prev) => ({
          ...prev,
          [jogoId]: {
            palpite_casa: "",
            palpite_fora: "",
            saving: false,
          },
        }));
        
        sucessos++;
      } catch (e: any) {
        erros++;
        console.error(`Erro ao remover palpite do jogo ${jogoId}:`, e);
      }
    }

    setRemovingAll(false);
    setRemoveProgress({ current: 0, total: 0 });

    // Recarregar palpites
    try {
      const lista = await listarMeusPalpitesNaRodada(ligaId, rodada);
      setMeusPalpites(lista);
    } catch (e) {
      console.error("Erro ao recarregar palpites:", e);
    }

    // Mostrar resultado
    if (erros === 0) {
      showToast("success", "Todos removidos!", `${sucessos} palpite(s) removidos com sucesso! 🗑️`);
    } else if (sucessos > 0) {
      showToast("info", "Parcialmente removido", `${sucessos} removidos, ${erros} com erro.`);
    } else {
      showToast("error", "Erro ao remover", `Não foi possível remover nenhum palpite. Tente novamente.`);
    }
  }

  async function handleDeletar(jogoId: number) {
    setErr(null);

    const ok = window.confirm("Deseja remover seu palpite deste jogo?");
    if (!ok) return;

    setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: true } }));

    try {
      await deletarMeuPalpite(ligaId, jogoId);
      showToast("success", "Removido!", "Palpite removido com sucesso.");

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
      const errorMsg = extractApiErrorMessage(e);
      setErr(errorMsg);
      showToast("error", "Erro ao remover", errorMsg);
      setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: false } }));
    }
  }

  // Contar palpites preenchidos (para Salvar Todos)
  const palpitesPreenchidos = useMemo(() => {
    return jogos.filter(jogo => {
      if (isFinalizado(jogo.status)) return false;
      const f = forms[jogo.id];
      return f && f.palpite_casa.trim() !== "" && f.palpite_fora.trim() !== "";
    }).length;
  }, [jogos, forms]);

  // Contar palpites salvos (para Remover Todos)
  const palpitesSalvos = useMemo(() => {
    return jogos.filter(jogo => {
      if (isFinalizado(jogo.status)) return false;
      const meu = meusPalpitesMap.get(jogo.id);
      return meu && meu.palpite_casa != null && meu.palpite_fora != null;
    }).length;
  }, [jogos, meusPalpitesMap]);

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
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
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

      {/* Seletor de rodada */}
      <section style={{ ...sectionStyle, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ marginTop: 0, marginBottom: 0, fontWeight: 600 }}>Rodada</h2>
          
          {/* Botões Salvar e Remover Todos - Alinhados à direita */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginLeft: "auto", justifyContent: "flex-end", paddingTop: 12}}>
            <button
              type="button"
              onClick={handleSalvarTodos}
              disabled={savingAll || removingAll || loading || palpitesPreenchidos === 0}
              style={saveAllButtonStyle(savingAll || removingAll)}
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

            <button
              type="button"
              onClick={handleRemoverTodos}
              disabled={savingAll || removingAll || loading || palpitesSalvos === 0}
              style={removeAllButtonStyle(removingAll || savingAll)}
              title={palpitesSalvos === 0 ? "Não há palpites para remover" : `Remover ${palpitesSalvos} palpite(s)`}
            >
              {removingAll ? (
                <>
                  🗑️ Removendo {removeProgress.current}/{removeProgress.total}...
                </>
              ) : (
                <>
                  🗑️ Remover Todos ({palpitesSalvos})
                </>
              )}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
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
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Jogos</h2>

        {loading ? <p>Carregando jogos...</p> : null}
        {!loading && jogos.length === 0 ? <p>Nenhum jogo encontrado nesta rodada.</p> : null}

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {jogos.map((j) => {
            const meu = meusPalpitesMap.get(j.id) ?? null;
            const f = forms[j.id] ?? { palpite_casa: "", palpite_fora: "" };
            const finalizado = isFinalizado(j.status);
            const disabled = finalizado || !!f.saving || savingAll || removingAll;

            return (
              <div key={j.id} style={gameCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>
                      {j.time_casa.nome} <span style={{ opacity: 0.7 }}>vs</span> {j.time_fora.nome}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                      {formatDateTimeSP(j.data_hora)} • <code>{j.status}</code>
                    </div>
                  </div>

                  {meu && meu.pontos != null ? (
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      Pontos: <span style={{ color: "#2ca02c" }}>{meu.pontos}</span>
                    </div>
                  ) : null}
                </div>

                {/* Placar real (se disponível) */}
                {(j.gols_casa != null || j.gols_fora != null) && finalizado ? (
                  <div style={{ fontSize: 14, marginBottom: 12, opacity: 0.9 }}>
                    Placar final: <strong>{j.gols_casa ?? "—"} x {j.gols_fora ?? "—"}</strong>
                  </div>
                ) : null}

                {/* Formulário de palpite */}
                {mobile ? (
                  <MobilePlacar
                    j={j}
                    f={f}
                    p={meu}
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
                    p={meu}
                    disabled={disabled}
                    finalizado={finalizado}
                    onChangeCasa={(v) => setFormValue(j.id, "palpite_casa", v)}
                    onChangeFora={(v) => setFormValue(j.id, "palpite_fora", v)}
                    onSalvar={() => handleSalvar(j.id)}
                    onRemover={() => handleDeletar(j.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

/* ----------------------------- Componentes de Placar ----------------------------- */

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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
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
  return `/escudos/${sigla.toUpperCase()}.png`;
}

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

// Estilo do botão "Salvar Todos"
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

// Estilo do botão "Remover Todos"
function removeAllButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "12px 20px",
    borderRadius: 10,
    border: "none",
    background: disabled ? "#ccc" : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    fontSize: 14,
    boxShadow: disabled ? "none" : "0 4px 12px rgba(240, 147, 251, 0.4)",
    transition: "all 0.3s ease",
    opacity: disabled ? 0.6 : 1,
  };
}

// Estilos do Toast (Pop-up)
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
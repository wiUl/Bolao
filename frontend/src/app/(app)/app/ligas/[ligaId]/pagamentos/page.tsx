"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { RequireAdminLiga } from "@/app/auth/RequireAdminLiga";

import { listarMembrosLiga } from "@/app/api/membroLigas";
import type { LigaMembroComUsuario } from "@/app/types/ligaMembro";

import { listarCobrancaMeses, upsertCobrancaMes } from "@/app/api/cobranca_mes";
import { listarPagamentosLiga, upsertPagamentoLiga } from "@/app/api/pagamentos";
import type { LigaPagamentoResponse } from "@/app/types/pagamentos";

const MESES: { mes: number; label: string }[] = [
  { mes: 1, label: "Jan" },
  { mes: 2, label: "Fev" },
  { mes: 3, label: "Mar" },
  { mes: 4, label: "Abr" },
  { mes: 5, label: "Mai" },
  { mes: 6, label: "Jun" },
  { mes: 7, label: "Jul" },
  { mes: 8, label: "Ago" },
  { mes: 9, label: "Set" },
  { mes: 10, label: "Out" },
  { mes: 11, label: "Nov" },
  { mes: 12, label: "Dez" },
];

type PagamentosState = Record<number, Record<number, boolean>>; // usuario_id -> mes -> pago
type SavingCellState = Record<string, boolean>; // `${usuarioId}-${mes}`
type SavingMesState = Record<number, boolean>; // mes -> saving

function keyCell(usuarioId: number, mes: number) {
  return `${usuarioId}-${mes}`;
}

function extractApiErrorMessage(err: any): string {
  const msg = err?.response?.data?.detail;
  if (typeof msg === "string") return msg;
  if (typeof err?.message === "string") return err.message;
  return "Erro ao salvar.";
}

export default function PagamentosPage() {
  const params = useParams();
  const ligaId = Number(params?.ligaId);

  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  const [membros, setMembros] = useState<LigaMembroComUsuario[]>([]);

  const [mesesAtivos, setMesesAtivos] = useState<number[]>([]);
  const [savingMes, setSavingMes] = useState<SavingMesState>({});

  const [state, setState] = useState<PagamentosState>({});
  const [savingCell, setSavingCell] = useState<SavingCellState>({});

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // auto-hide do sucesso
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 2500);
    return () => clearTimeout(t);
  }, [ok]);

  async function carregarTudo(isReload: boolean = false) {
    setErr(null);
    setOk(null);

    if (isReload) setReloading(true);
    else setLoading(true);

    try {
      if (!Number.isFinite(ligaId)) {
        setErr("ligaId inválido.");
        return;
      }

      // 1) membros
      const membrosApi = await listarMembrosLiga(ligaId);
      setMembros(membrosApi);

      // 2) meses ativos (config)
      const cobranca = await listarCobrancaMeses(ligaId, false); // pega todos, ativos e inativos
      const ativos = cobranca
        .filter((x) => x.ativo)
        .map((x) => x.mes)
        .sort((a, b) => a - b);

      setMesesAtivos(ativos);

      // 3) pagamentos
      const pagamentos = await listarPagamentosLiga(ligaId);

      // estado inicial default=false só pros meses ativos
      const initial: PagamentosState = {};
      for (const m of membrosApi) {
        initial[m.usuario_id] = {};
        for (const mes of ativos) initial[m.usuario_id][mes] = false;
      }

      for (const p of pagamentos) {
        if (!initial[p.usuario_id]) initial[p.usuario_id] = {};
        if (ativos.includes(p.mes)) {
          initial[p.usuario_id][p.mes] = !!p.pago;
        }
      }

      setState(initial);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      if (isReload) setReloading(false);
      else setLoading(false);
    }
  }

  useEffect(() => {
    carregarTudo(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ligaId]);

  // ======= Chips: ativar/desativar mês =======
  const mesesAtivosSet = useMemo(() => new Set(mesesAtivos), [mesesAtivos]);

  async function toggleMesAtivo(mes: number) {
    setErr(null);
    setOk(null);

    if (savingMes[mes]) return;

    const currentlyActive = mesesAtivosSet.has(mes);
    const nextActive = !currentlyActive;

    // otimista: muda chips imediatamente
    setSavingMes((prev) => ({ ...prev, [mes]: true }));
    setMesesAtivos((prev) => {
      const s = new Set(prev);
      if (nextActive) s.add(mes);
      else s.delete(mes);
      return Array.from(s).sort((a, b) => a - b);
    });

    try {
      await upsertCobrancaMes(ligaId, mes, nextActive);

      // Se desativou mês, remove coluna do state local (pra não ficar lixo)
      if (!nextActive) {
        setState((prev) => {
          const copy: PagamentosState = {};
          for (const uidStr of Object.keys(prev)) {
            const uid = Number(uidStr);
            const row = prev[uid] ?? {};
            const { [mes]: _removed, ...rest } = row as any;
            copy[uid] = rest as Record<number, boolean>;
          }
          return copy;
        });
      } else {
        // Se ativou mês, adiciona coluna default=false em todos
        setState((prev) => {
          const copy: PagamentosState = { ...prev };
          for (const m of membros) {
            const uid = m.usuario_id;
            copy[uid] = { ...(copy[uid] ?? {}), [mes]: copy[uid]?.[mes] ?? false };
          }
          return copy;
        });
      }

      setOk("Configuração salva!");
    } catch (e: any) {
      // rollback chip
      setMesesAtivos((prev) => {
        const s = new Set(prev);
        if (currentlyActive) s.add(mes);
        else s.delete(mes);
        return Array.from(s).sort((a, b) => a - b);
      });
      setErr(extractApiErrorMessage(e));
    } finally {
      setSavingMes((prev) => ({ ...prev, [mes]: false }));
    }
  }

  // ======= Tabela: toggle pagamento =======
  async function togglePagamento(usuarioId: number, mes: number) {
    setErr(null);
    setOk(null);

    const k = keyCell(usuarioId, mes);
    if (savingCell[k]) return;

    const current = state?.[usuarioId]?.[mes] ?? false;
    const next = !current;

    // otimista
    setState((prev) => ({
      ...prev,
      [usuarioId]: { ...(prev[usuarioId] ?? {}), [mes]: next },
    }));

    setSavingCell((prev) => ({ ...prev, [k]: true }));

    try {
      await upsertPagamentoLiga(ligaId, usuarioId, { mes, pago: next });
      setOk("Salvo!");
    } catch (e: any) {
      // rollback
      setState((prev) => ({
        ...prev,
        [usuarioId]: { ...(prev[usuarioId] ?? {}), [mes]: current },
      }));
      setErr(extractApiErrorMessage(e));
    } finally {
      setSavingCell((prev) => ({ ...prev, [k]: false }));
    }
  }

  const totals = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of membros) {
      const row = state[m.usuario_id] ?? {};
      const total = mesesAtivos.reduce((acc, mes) => acc + (row[mes] ? 1 : 0), 0);
      map.set(m.usuario_id, total);
    }
    return map;
  }, [membros, state, mesesAtivos]);

  // ===== estilos =====
  const pageStyle: React.CSSProperties = { padding: 24, maxWidth: 1200, margin: "0 auto" };

  const sectionStyle: React.CSSProperties = {
    marginTop: 18,
    padding: 16,
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface)",
  };

  const headCell: React.CSSProperties = {
    background: "var(--table-head-bg)",
    color: "var(--table-head-fg)",
    padding: "10px 8px",
    borderBottom: "1px solid var(--border)",
    textAlign: "center",
    fontWeight: 700,
    position: "sticky",
    top: 0,
    zIndex: 3,
    minWidth: 70,
  };

  const headNameCell: React.CSSProperties = {
    ...headCell,
    left: 0,
    zIndex: 4,
    minWidth: 190,
    textAlign: "left",
  };

  const nameCell: React.CSSProperties = {
    background: "var(--table-name-bg)",
    padding: "10px 8px",
    borderBottom: "1px solid var(--border)",
    fontWeight: 700,
    position: "sticky",
    left: 0,
    zIndex: 2,
    minWidth: 190,
  };

  const cellStyle = (checked: boolean, isSaving: boolean): React.CSSProperties => ({
    background: checked ? "var(--success-bg)" : "var(--danger-bg)",
    color: checked ? "var(--success-fg)" : "var(--danger-fg)",
    opacity: isSaving ? 0.6 : 1,
    padding: "10px 8px",
    borderBottom: "1px solid var(--border)",
    borderRight: "1px solid var(--border)",
    textAlign: "center",
    cursor: isSaving ? "not-allowed" : "pointer",
    userSelect: "none",
    fontWeight: 800,
    minWidth: 70,
  });

  const chipStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: active ? "var(--success-bg)" : "var(--danger-bg)",
    color: active ? "var(--success-fg)" : "var(--danger-fg)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    opacity: disabled ? 0.6 : 1,
    userSelect: "none",
  });

  return (
    <RequireAdminLiga>
      <main style={pageStyle}>
        <section style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <h1 style={{ marginTop: 0, marginBottom: 0, fontWeight: 600 }}>Pagamentos · Liga #{ligaId}</h1>

            <Link href={`/app/ligas/${ligaId}`} style={{ textDecoration: "none", fontWeight: 600, color: "inherit" }}>
              Voltar
            </Link>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => carregarTudo(true)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                cursor: "pointer",
                fontWeight: 600,
              }}
              disabled={reloading || loading}
            >
              {reloading || loading ? "Carregando..." : "Recarregar"}
            </button>

            <div style={{ marginLeft: "auto", fontSize: 14, opacity: 0.9 }}>Verde = pago • Vermelho = pendente</div>
          </div>

          {ok ? <p style={{ marginTop: 10, color: "var(--success-text)", fontWeight: 600 }}>{ok}</p> : null}
          {err ? <p style={{ marginTop: 10, color: "var(--danger-text)", fontWeight: 600 }}>{err}</p> : null}
        </section>

        {/* Configuração dos meses */}
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, fontWeight: 600 }}>Meses cobrados</h2>
          <p style={{ marginTop: 6, marginBottom: 12, opacity: 0.85 }}>
            Clique nos meses para ativar/desativar. A tabela abaixo só mostra meses ativos.
          </p>

          {loading ? (
            <p>Carregando...</p>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {MESES.map(({ mes, label }) => {
                const active = mesesAtivosSet.has(mes);
                const disabled = !!savingMes[mes];
                return (
                  <button
                    key={mes}
                    type="button"
                    onClick={() => toggleMesAtivo(mes)}
                    disabled={disabled}
                    style={chipStyle(active, disabled)}
                    title={active ? "Ativo (cobrando)" : "Inativo (não cobra)"}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {mesesAtivos.length === 0 && !loading ? (
            <p style={{ marginTop: 12 }}>Nenhum mês ativo. Ative pelo menos 1 mês para poder marcar pagamentos.</p>
          ) : null}
        </section>

        {/* Tabela */}
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, fontWeight: 600 }}>Tabela</h2>

          {loading ? (
            <p>Carregando...</p>
          ) : mesesAtivos.length === 0 ? (
            <p>Ative meses acima para aparecerem colunas aqui.</p>
          ) : membros.length === 0 ? (
            <p>Nenhum membro encontrado.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={headNameCell}>Usuário</th>
                    {mesesAtivos.map((mes) => {
                      const label = MESES.find((x) => x.mes === mes)?.label ?? `M${mes}`;
                      return (
                        <th key={mes} style={headCell}>
                          {label}
                        </th>
                      );
                    })}
                    <th style={headCell}>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {membros.map((m) => (
                    <tr key={m.usuario_id}>
                      <td style={nameCell}>{m.nome || `Usuário #${m.usuario_id}`}</td>

                      {mesesAtivos.map((mes) => {
                        const checked = state?.[m.usuario_id]?.[mes] ?? false;
                        const isSaving = !!savingCell[keyCell(m.usuario_id, mes)];

                        return (
                          <td
                            key={mes}
                            style={cellStyle(checked, isSaving)}
                            onClick={() => (!isSaving ? togglePagamento(m.usuario_id, mes) : null)}
                            title={checked ? "Pago" : "Pendente"}
                          >
                            {checked ? "✓" : ""}
                          </td>
                        );
                      })}

                      <td style={{ ...cellStyle(false, false), background: "#f7f7f7", cursor: "default" }}>
                        {totals.get(m.usuario_id) ?? 0}/{mesesAtivos.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </RequireAdminLiga>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { RequireAdminLiga } from "@/app/auth/RequireAdminLiga";
import { listarMembrosLiga } from "@/app/api/membroLigas";
import type { LigaMembroComUsuario } from "@/app/types/ligaMembro";



const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
] as const;

type Mes = (typeof MESES)[number];
type PagamentosState = Record<number, Record<Mes, boolean>>;

function storageKey(ligaId: number) {
  return `bolao_pagamentos_${ligaId}`;
}

export default function PagamentosPage() {
  const params = useParams();
  const ligaId = Number(params?.ligaId);

  const [loading, setLoading] = useState(true);
  const [membros, setMembros] = useState<LigaMembroComUsuario[]>([]);
  const [state, setState] = useState<PagamentosState>({});

  useEffect(() => {
    (async () => {
      setLoading(true);

    const membrosApi = await listarMembrosLiga(ligaId);
    setMembros(membrosApi);

      // carrega do localStorage
      const raw = localStorage.getItem(storageKey(ligaId));
      const parsed: PagamentosState = raw ? JSON.parse(raw) : {};

      // normaliza: garante que cada membro tenha todos os meses
    const normalized: PagamentosState = {};
    for (const m of membrosApi) {
    normalized[m.usuario_id] = {} as Record<Mes, boolean>;
    for (const mes of MESES) {
        normalized[m.usuario_id][mes] = Boolean(parsed?.[m.usuario_id]?.[mes]);
    }
    }
    setState(normalized);
      setLoading(false);
    })();
  }, [ligaId]);

  useEffect(() => {
    if (!ligaId) return;
    localStorage.setItem(storageKey(ligaId), JSON.stringify(state));
  }, [state, ligaId]);

  function toggle(usuarioId: number, mes: Mes) {
    setState((prev) => ({
      ...prev,
      [usuarioId]: {
        ...(prev[usuarioId] ?? ({} as Record<Mes, boolean>)),
        [mes]: !prev?.[usuarioId]?.[mes],
      },
    }));
  }

  const totals = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of membros) {
      const row = state[m.usuario_id];
      const total = row ? MESES.reduce((acc, mes) => acc + (row[mes] ? 1 : 0), 0) : 0;
      map.set(m.usuario_id, total);
    }
    return map;
  }, [membros, state]);

  // estilos simples (parecido com seu esboço)
  const pageStyle: React.CSSProperties = { padding: 24, maxWidth: 1200, margin: "0 auto" };
  const sectionStyle: React.CSSProperties = { marginTop: 18, padding: 16, border: "1px solid #e5e5e5", borderRadius: 10 };

  const headCell: React.CSSProperties = {
    background: "#ffeb3b",
    padding: "10px 8px",
    borderBottom: "1px solid #eee",
    textAlign: "center",
    fontWeight: 700,
    position: "sticky",
    top: 0,
    zIndex: 3,
    minWidth: 95,
  };

  const headNameCell: React.CSSProperties = { ...headCell, left: 0, zIndex: 4, minWidth: 170, textAlign: "left" };

  const nameCell: React.CSSProperties = {
    background: "#d9f2d3",
    padding: "10px 8px",
    borderBottom: "1px solid #f2f2f2",
    fontWeight: 700,
    position: "sticky",
    left: 0,
    zIndex: 2,
    minWidth: 170,
  };

  const cellStyle = (checked: boolean): React.CSSProperties => ({
    background: checked ? "#d9f9e3" : "#ffe0e0", // verde claro / vermelho claro
    padding: "10px 8px",
    borderBottom: "1px solid #f2f2f2",
    borderRight: "1px solid #f2f2f2",
    textAlign: "center",
    cursor: "pointer",
    userSelect: "none",
    fontWeight: 800,
    minWidth: 95,
  });

  return (
    <RequireAdminLiga>
      <main style={pageStyle}>
        <section style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <h1 style={{ marginTop: 0, marginBottom: 0, fontWeight: 600 }}>
              Pagamentos · Liga #{ligaId}
            </h1>

            <Link href={`/app/ligas/${ligaId}`} style={{ textDecoration: "none", fontWeight: 600 }}>
              Voltar
            </Link>
          </div>

          <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.9 }}>
            Clique nos meses para marcar pagamento. Verde = pago, vermelho = pendente. (Salvo localmente no seu navegador.)
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, fontWeight: 600 }}>Tabela</h2>

          {loading ? (
            <p>Carregando...</p>
          ) : membros.length === 0 ? (
            <p>Nenhum membro encontrado.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={headNameCell}>Usuário</th>
                    {MESES.map((mes) => (
                      <th key={mes} style={headCell}>{mes}</th>
                    ))}
                    <th style={headCell}>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {membros.map((m) => (
                    <tr key={m.usuario_id}>
                      <td style={nameCell}>{m.nome}</td>

                      {MESES.map((mes) => {
                        const checked = state?.[m.usuario_id]?.[mes] ?? false;
                        return (
                          <td
                            key={mes}
                            style={cellStyle(checked)}
                            onClick={() => toggle(m.usuario_id, mes)}
                            title={checked ? "Pago" : "Pendente"}
                          >
                            {checked ? "✓" : ""}
                          </td>
                        );
                      })}

                      <td style={{ ...cellStyle(false), background: "#f7f7f7", cursor: "default" }}>
                        {totals.get(m.usuario_id) ?? 0}/12
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

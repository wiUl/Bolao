"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { listarMinhasLigas } from "@/app/api/ligas";
import { listarMembrosLiga, alterarPapelMembro, removerMembroLiga, sairDaLiga } from "@/app/api/membroLigas";

import { useAuth } from "@/app/auth/AuthContext";

import { atualizarLiga } from "@/app/api/ligas";

import type { Liga } from "@/app/types/liga";
import type { LigaMembroComUsuario, LigaRole } from "@/app/types/ligaMembro";

export default function LigaPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const ligaId = Number(params?.ligaId);
  const [loading, setLoading] = useState(true);

  const [liga, setLiga] = useState<Liga | null>(null);
  const [membros, setMembros] = useState<LigaMembroComUsuario[]>([]);

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [editNomeOpen, setEditNomeOpen] = useState(false);
  const [nomeEdit, setNomeEdit] = useState(""); 
  const [savingNome, setSavingNome] = useState(false);


  // modal/confirm de sair
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [novoDonoId, setNovoDonoId] = useState<number | "">("");

  // auto-hide do sucesso
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  const meuMembro = useMemo(() => {
    if (!user) return null;
    return membros.find((m) => m.usuario_id === user.id) ?? null;
  }, [membros, user]);

  const meuPapel: LigaRole | null = meuMembro?.papel ?? null;

  const canManage = meuPapel === "dono" || meuPapel === "admin_liga";

  // dono pode alterar membro/admin; admin só altera membro (backend bloqueia mexer em admin/dono)
  const canChangeRoles = meuPapel === "dono" || meuPapel === "admin_liga";

  async function carregar() {
    setErr(null);
    setLoading(true);

    try {
      if (!Number.isFinite(ligaId)) {
        setErr("ligaId inválido.");
        return;
      }

      // 1) Carrega liga (não existe GET /ligas/{id}, então buscamos nas minhas ligas)
      const minhas = await listarMinhasLigas();
      const found = minhas.find((l) => l.id === ligaId) ?? null;

      if (!found) {
        setErr("Liga não encontrada ou você não participa dela.");
        setLiga(null);
        return;
      }

      setLiga(found);
      setNomeEdit(found.nome);


      // 2) Carrega membros
      const lista = await listarMembrosLiga(ligaId);
      setMembros(lista);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ligaId]);

  async function handleAlterarPapel(usuarioId: number, papel: Exclude<LigaRole, "dono">) {
    setErr(null);
    setMsg(null);

    try {
      await alterarPapelMembro(ligaId, usuarioId, { papel });
      setMsg("Papel atualizado.");
      await carregar();
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    }
  }

  async function handleRemover(usuarioId: number) {
    setErr(null);
    setMsg(null);

    try {
      await removerMembroLiga(ligaId, usuarioId);
      setMsg("Membro removido da liga.");
      await carregar();
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    }
  }

  async function handleSair() {
    setErr(null);
    setMsg(null);

    try {
      // Se você NÃO é dono: pode sair direto (backend remove e retorna 200)
      if (meuPapel !== "dono") {
        await sairDaLiga(ligaId);
        router.replace("/app/ligas");
        return;
      }

      // Se você É dono: backend exige novo_dono_usuario_id
      if (novoDonoId === "") {
        setErr("Escolha um novo dono para poder sair da liga.");
        return;
      }

      await sairDaLiga(ligaId, { novo_dono_usuario_id: novoDonoId });
      router.replace("/app/ligas");
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    }
  }

  async function handleSalvarNome() {
    setErr(null);
    setMsg(null);

    if (!Number.isInteger(ligaId)) {
      setErr("ligaId inválido.");
      return;
    } 

    const novoNome = nomeEdit.trim();
    if (novoNome.length < 3) {
      setErr("O nome da liga precisa ter pelo menos 3 caracteres.");
      return;
    }

    setSavingNome(true);
    try {
      await atualizarLiga(ligaId, { nome: novoNome });
      setMsg("Nome da liga atualizado.");
      setEditNomeOpen(false);
      await carregar(); // recarrega liga + membros
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setSavingNome(false);
    }
}


  const candidatosNovoDono = useMemo(() => {
    if (!user) return [];
    return membros.filter((m) => m.usuario_id !== user.id);
  }, [membros, user]);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      {/* Header em card */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {!editNomeOpen ? (
              <h1 style={{ marginTop: 0, marginBottom: 0, fontWeight: 600 }}>{liga ? liga.nome : "Liga"}</h1>
            ) : (
              <input
                value={nomeEdit}
                onChange={(e) => setNomeEdit(e.target.value)}
                style={{ ...inputStyle, maxWidth: 360 }}
                placeholder="Nome da liga"
              />
            )}

            {meuPapel === "dono" ? (
              !editNomeOpen ? (
                <button
                  onClick={() => setEditNomeOpen(true)}
                  style={secondaryBtnStyle}
                  type="button"
                >
                  Editar nome
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSalvarNome}
                    disabled={savingNome}
                    style={primaryBtnStyle(savingNome)}
                    type="button"
                  >
                    {savingNome ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    onClick={() => {
                      setEditNomeOpen(false);
                      setNomeEdit(liga?.nome ?? "");
                    }}
                    style={secondaryBtnStyle}
                    type="button"
                  >
                    Cancelar
                  </button>
                </>
              )
            ) : null}
          </div>


          <Link href="/app/ligas" style={{ textDecoration: "none", fontWeight: 600 }}>
            Voltar
          </Link>
        </div>

        <p style={{ marginTop: 8, marginBottom: 0 }}>
          Detalhes da liga, membros e permissões.
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

      {loading ? <p style={{ marginTop: 16 }}>Carregando...</p> : null}

      {!loading && liga ? (
        <>
          {/* Info da liga */}
          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0, fontWeight: 600 }}>Informações</h2>

            <div style={infoGrid}>
              <div style={infoItem}>
                <span style={infoLabel}>Temporada</span>
                <span>#{liga.temporada_id}</span>
              </div>

              <div style={infoItem}>
                <span style={infoLabel}>Código de convite</span>
                <span>
                  <code>{liga.codigo_convite}</code>
                </span>
              </div>

              <div style={infoItem}>
                <span style={infoLabel}>Seu papel</span>
                <span>
                  <strong>{meuPapel ?? "—"}</strong>
                </span>
              </div>
            </div>
          </section>

          {/* Pagamentos (somente dono/admin_liga) */}
          {canManage ? (
            <section style={sectionStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={{ marginTop: 0, marginBottom: 4, fontWeight: 600 }}>Pagamentos</h2>
                  <p style={{ margin: 0, opacity: 0.85 }}>
                    Controle de mensalidades da liga
                  </p>
                </div>

                <Link href={`/app/ligas/${ligaId}/pagamentos`} style={{ textDecoration: "none" }}>
                  <button
                    type="button"
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "white",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Abrir pagamentos
                  </button>
                </Link>
              </div>
            </section>
          ) : null}

          {/* Meus Palpites */}
          <section style={sectionStyle}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap"}}>
              <div>
                <h2 style={{marginTop: 0, marginBottom: 4, fontWeight: 600}}>Meus Palpites</h2>
                <p style={{margin: 0, opacity: 0.85}}>
                  Criar, editar e acompanhar seus palpites por rodada
                </p>
              </div>
              <Link href={`/app/ligas/${ligaId}/palpites`} style={{ textDecoration: "none" }}>
                <button type="button" style={{padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background:"white", cursor: "pointer", fontWeight: 600}}>
                Ir para meus Palpites
                </button>
              </Link>            
            </div>   
          </section>

          {/* Ranking */}    
          <section style={sectionStyle}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap"}}>
              <div>
                <h2 style={{marginTop: 0, marginBottom: 4, fontWeight: 600}}>Ranking</h2>
                <p style={{margin: 0, opacity: 0.85}}>
                  Visualizar Ranking Geral e por Rodada
                </p>
              </div>
              <Link href={`/app/ligas/${ligaId}/ranking`} style={{ textDecoration: "none" }}>
                <button type="button" style={{padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background:"white", cursor: "pointer", fontWeight: 600}}>Ver ranking</button>
              </Link>           
            </div>   
          </section>

          {/* Palpites da Liga */}  
          <section style={sectionStyle}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap"}}>
              <div>
                <h2 style={{marginTop: 0, marginBottom: 4, fontWeight: 600}}>Palpites da Liga</h2>
                <p style={{margin: 0, opacity: 0.85}}>
                  Compare palpites dos membros e veja a pontuação por jogo
                </p>
              </div>
              <Link href={`/app/ligas/${ligaId}/rodadas/1`} style={{ textDecoration: "none" }}>
                <button type="button" style={{padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background:"white", cursor: "pointer", fontWeight: 600}}>Ver palpites da rodada</button>
              </Link>           
            </div>   
          </section>
          
          {/* Gráficos */}
          <section style={sectionStyle}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap"}}>
              <div>
                <h2 style={{marginTop: 0, marginBottom: 4, fontWeight: 600}}>Gráficos</h2>
                <p style={{margin: 0, opacity: 0.85}}>
                  Visualize sua evolução e comparações na liga
                </p>
              </div>

              <Link href={`/app/ligas/${ligaId}/graficos`} style={{ textDecoration: "none" }}>
                <button
                  type="button"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  Ver gráficos
                </button>
              </Link>
            </div>
          </section>
   

          {/* Sair */}
          <section style={{ ...sectionStyle, borderColor: "#f2ddb0" }}>
            <h2 style={{ marginTop: 0 , fontWeight: 600}}>Sair da liga</h2>

            {!leaveOpen ? (
              <button onClick={() => setLeaveOpen(true)} style={secondaryBtnStyle} type="button">
                Quero sair
              </button>
            ) : (
              <div style={{ marginTop: 10 }}>
                <div style={alertStyle("warn")}>
                  <strong>Atenção:</strong>{" "}
                  {meuPapel === "dono"
                    ? "Como você é o dono, escolha um novo dono antes de sair."
                    : "Tem certeza que deseja sair da liga?"}
                </div>

                {meuPapel === "dono" ? (
                  <label style={{ ...labelStyle, maxWidth: 420 }}>
                    <span>Novo dono</span>
                    <select
                      value={novoDonoId}
                      onChange={(e) => setNovoDonoId(e.target.value ? Number(e.target.value) : "")}
                      style={inputStyle}
                    >
                      <option value="">Selecione</option>
                      {candidatosNovoDono.map((m) => (
                        <option key={m.usuario_id} value={m.usuario_id}>
                          {m.nome} ({m.papel})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button onClick={handleSair} style={primaryBtnStyle(false)} type="button">
                    Confirmar
                  </button>
                  <button
                    onClick={() => {
                      setLeaveOpen(false);
                      setNovoDonoId("");
                    }}
                    style={secondaryBtnStyle}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Membros */}
          <section style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <h2 style={{ marginTop: 0 , fontWeight: 600}}>Membros</h2>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{membros.length} membro(s)</span>
            </div>

            {membros.length === 0 ? <p>Nenhum membro encontrado.</p> : null}

            {membros.length > 0 ? (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {membros.map((m) => {
                  const isMe = user?.id === m.usuario_id;

                  return (
                    <div key={m.id} style={memberCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <strong>{m.nome}</strong>{" "}
                          {isMe ? <span style={{ opacity: 0.75 }}>(você)</span> : null}
                          <div style={{ fontSize: 14, opacity: 0.85 }}>
                            Papel: <code>{m.papel}</code>
                          </div>
                        </div>

                        {/* Ações: somente se pode gerenciar */}
                        {canManage ? (
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {/* Alterar papel (backend bloqueia: não pode virar dono, não pode alterar a si mesmo, admin não mexe em admin/dono) */}
                            {canChangeRoles && !isMe ? (
                              <select
                                value={m.papel}
                                onChange={(e) =>
                                  handleAlterarPapel(
                                    m.usuario_id,
                                    e.target.value as Exclude<LigaRole, "dono">
                                  )
                                }
                                style={{ ...inputStyle, padding: "8px 10px" }}
                                disabled={m.papel === "dono"}
                                title={m.papel === "dono" ? "Não é possível alterar o dono por aqui" : ""}
                              >
                                <option value="membro">membro</option>
                                <option value="admin_liga">admin_liga</option>
                              </select>
                            ) : null}

                            {/* Remover (não remover a si mesmo) */}
                            {!isMe ? (
                              <button onClick={() => handleRemover(m.usuario_id)} style={dangerBtnStyle} type="button">
                                Remover
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  );
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

function alertStyle(kind: "success" | "error" | "warn"): React.CSSProperties {
  const base: React.CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  };
  if (kind === "success") return { ...base, borderColor: "#b7e3c5" };
  if (kind === "error") return { ...base, borderColor: "#f3c2c2" };
  return { ...base, borderColor: "#f2ddb0" };
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 18,
};

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginTop: 12,
};

const infoItem: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const infoLabel: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.7,
};

const memberCard: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 12,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: "10px 12px",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
};

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: disabled ? "#f5f5f5" : "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
  };
}

const dangerBtnStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #f3c2c2",
  background: "white",
  cursor: "pointer",
  fontWeight: 600,
};

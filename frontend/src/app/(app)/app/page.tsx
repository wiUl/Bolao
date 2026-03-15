"use client";

import Link from "next/link";
import { useAuth } from "@/app/auth/AuthContext";
import { isAdmin } from "@/app/auth/isAdmin";

export default function AppHomePage() {
  const { user } = useAuth();

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>
        Olá{user?.nome ? `, ${user.nome}` : ""} 👋
      </h1>

      <p style={{ marginTop: 0 }}>
        Bem-vindo ao FutBolão. Palpite nos jogos, dispute com amigos e suba no ranking.
      </p>

      {/* ── Ações rápidas ── */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>O que você quer fazer?</h2>

        <div style={gridStyle}>
          <Link href="/app/ligas" style={cardStyle}>
            <strong>Minhas Ligas</strong>
            <span>Ver suas ligas, criar uma nova ou entrar por código de convite</span>
          </Link>

          <Link href="/app/perfil" style={cardStyle}>
            <strong>Meu Perfil</strong>
            <span>Editar seus dados e configurar notificações</span>
          </Link>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Como funciona</h2>

        <p style={{ marginTop: 0 }}>
          O FutBolão é um bolão de futebol por ligas privadas. Cada liga é vinculada a
          uma temporada de um campeonato. Você e seus amigos enviam palpites para os jogos
          antes do apito inicial — depois que o jogo começa os palpites ficam bloqueados.
          Ao final de cada partida os pontos são calculados automaticamente.
        </p>
        <br></br><br></br>
        <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Tabela de pontuação</h3>

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Resultado do palpite</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Pontos</th>
                <th style={thStyle}>Exemplo</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  resultado: "Placar exato",
                  pontos: 5,
                  exemplo: "Palpite 2x1 · Resultado 2x1",
                  destaque: true,
                },
                {
                  resultado: "Diferença de gols correta (sem empate)",
                  pontos: 4,
                  exemplo: "Palpite 3x1 · Resultado 2x0 (diferença +2 em ambos)",
                  destaque: false,
                },
                {
                  resultado: "Acertou o vencedor (sem empate)",
                  pontos: 3,
                  exemplo: "Palpite 2x0 · Resultado 1x0",
                  destaque: false,
                },
                {
                  resultado: "Acertou o empate",
                  pontos: 3,
                  exemplo: "Palpite 1x1 · Resultado 0x0",
                  destaque: false,
                },
                {
                  resultado: "Errou o resultado",
                  pontos: 0,
                  exemplo: "Palpite 2x0 · Resultado 0x1",
                  destaque: false,
                },
              ].map((row, i) => (
                <tr key={i} style={i % 2 === 0 ? trEvenStyle : {}}>
                  <td style={tdStyle}>{row.resultado}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, fontSize: 17 }}>
                    <span style={badgeStyle(row.pontos)}>{row.pontos}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13, opacity: 0.75 }}>{row.exemplo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 style={{ fontWeight: 600, marginTop: 20, marginBottom: 8 }}>Regras gerais</h3>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, listStyleType: "disc", listStylePosition: "outside" }}>
          <li>Palpites só podem ser enviados ou alterados <strong>antes do início</strong> do jogo.</li>
          <li>Cada membro da liga envia um palpite por jogo — o último enviado antes do bloqueio vale.</li>
          <li>O ranking é calculado pela soma de pontos acumulados na temporada.</li>
          <li>Para entrar em uma liga existente você precisa de um <strong>código de convite</strong>.</li>
          <li>Cada liga pertence a uma única temporada de um campeonato.</li>
        </ul>
      </section>

      {/* ── Admin ── */}
      {isAdmin(user) ? (
        <section style={{ ...sectionStyle, borderColor: "#f2ddb0" }}>
          <h2 style={{ marginTop: 0, marginBottom: 12, fontWeight: 600 }}>Admin</h2>

          <div style={gridStyle}>
            {[
              { href: "/admin/competicoes", label: "Competições", desc: "Gerenciar competições" },
              { href: "/admin/temporadas",  label: "Temporadas",  desc: "Gerenciar temporadas" },
              { href: "/admin/times",       label: "Times",       desc: "Gerenciar times" },
              { href: "/admin/jogos",       label: "Jogos",       desc: "Gerenciar jogos e resultados" },
              { href: "/admin/usuarios",    label: "Usuários",    desc: "Gerenciar usuários" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={cardStyle}>
                <strong>{item.label}</strong>
                <span>{item.desc}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 18,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginTop: 12,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  textDecoration: "none",
  color: "inherit",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  marginTop: 4,
};

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "2px solid #ddd",
  textAlign: "left",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #eee",
  verticalAlign: "middle",
};

const trEvenStyle: React.CSSProperties = {
  background: "var(--surface, rgba(0,0,0,0.02))",
};

function badgeStyle(pontos: number): React.CSSProperties {
  const colors: Record<number, { bg: string; color: string; border: string }> = {
    5: { bg: "#e8f5e9", color: "#2e7d32", border: "#b7e3c5" },
    4: { bg: "#fff8e1", color: "#e65100", border: "#ffe082" },
    3: { bg: "#e3f0fb", color: "#1565c0", border: "#aed0f0" },
    0: { bg: "#fce8e8", color: "#b71c1c", border: "#f3c2c2" },
  };
  const c = colors[pontos] ?? colors[0];
  return {
    display: "inline-block",
    padding: "2px 12px",
    borderRadius: 20,
    background: c.bg,
    color: c.color,
    border: `1px solid ${c.border}`,
    fontWeight: 700,
    fontSize: 15,
  };
}
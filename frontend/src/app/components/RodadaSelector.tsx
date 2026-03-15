"use client";

import { useEffect, useState, ReactNode } from "react";

interface RodadaSelectorProps {
  /** Valor atual da rodada (número confirmado) */
  rodada: number;
  /** Callback ao confirmar nova rodada */
  onChange: (n: number) => void;
  /** Desabilita toda a interação (ex: durante loading) */
  disabled?: boolean;
  /** Slot opcional de botões de ação exibidos à direita (ex: Salvar Todos) */
  actions?: ReactNode;
}

/**
 * Seletor de rodada padronizado para o FutBolão.
 *
 * - Input interno usa string para não travar no mobile ao apagar o número.
 * - O valor só é confirmado em blur, Enter ou clique nos botões prev/next/go.
 * - O slot `actions` permite adicionar botões extras (ex: Salvar/Remover Todos).
 */
export function RodadaSelector({ rodada, onChange, disabled = false, actions }: RodadaSelectorProps) {
  // Estado interno de string para permitir apagar livremente no mobile
  const [draft, setDraft] = useState(String(rodada));

  // Sincroniza draft quando rodada muda externamente
  useEffect(() => {
    setDraft(String(rodada));
  }, [rodada]);

  function confirmar(value: string) {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 1) {
      onChange(n);
    } else {
      // valor inválido: restaura o display para o valor atual
      setDraft(String(rodada));
    }
  }

  function handlePrev() {
    const n = Math.max(1, rodada - 1);
    onChange(n);
  }

  function handleNext() {
    onChange(rodada + 1);
  }

  return (
    <div style={wrapStyle}>
      {/* Navegação */}
      <div style={navStyle}>
        <button
          type="button"
          style={btnStyle(disabled || rodada <= 1)}
          onClick={handlePrev}
          disabled={disabled || rodada <= 1}
          aria-label="Rodada anterior"
        >
          ← Anterior
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label htmlFor="rodada-input" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
            Rodada
          </label>
          <input
            id="rodada-input"
            type="number"
            inputMode="numeric"
            min={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => confirmar(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmar((e.target as HTMLInputElement).value);
            }}
            disabled={disabled}
            style={inputStyle}
            aria-label="Número da rodada"
          />
        </div>

        <button
          type="button"
          style={btnStyle(disabled || draft === String(rodada))}
          onClick={() => confirmar(draft)}
          disabled={disabled || draft === String(rodada)}
          aria-label="Ir para a rodada digitada"
        >
          Ir
        </button>

        <button
          type="button"
          style={btnStyle(disabled)}
          onClick={handleNext}
          disabled={disabled}
          aria-label="Próxima rodada"
        >
          Próxima →
        </button>
      </div>

      {/* Slot de ações extras (opcional) */}
      {actions && <div style={actionsStyle}>{actions}</div>}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const wrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const navStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--foreground)",
  outline: "none",
  height: 42,
  width: 84,
  textAlign: "center",
};

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "var(--surface)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
  };
}
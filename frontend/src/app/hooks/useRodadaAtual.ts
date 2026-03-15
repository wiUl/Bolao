"use client";

import { useEffect, useState } from "react";
import { getRodadaAtual } from "@/app/api/jogos";

/**
 * Hook que busca a rodada atual de uma temporada.
 * Retorna `null` enquanto carrega, e o número da rodada quando pronto.
 * Em caso de erro mantém `null` — o componente deve usar 1 como fallback.
 */
export function useRodadaAtual(temporadaId: number | null | undefined): number | null {
  const [rodadaAtual, setRodadaAtual] = useState<number | null>(null);

  useEffect(() => {
    if (!temporadaId) return;

    let alive = true;
    getRodadaAtual(temporadaId)
      .then((r) => { if (alive) setRodadaAtual(r); })
      .catch(() => { /* fallback para 1 no consumer */ });

    return () => { alive = false; };
  }, [temporadaId]);

  return rodadaAtual;
}
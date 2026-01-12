export function formatDateTimeSP(iso: string | null) {
  if (!iso) return "Data ainda não definida";

  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Data inválida";

  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

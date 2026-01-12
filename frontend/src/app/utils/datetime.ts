export function formatUtcToBrazil(utcIso: string) {
  return new Date(utcIso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

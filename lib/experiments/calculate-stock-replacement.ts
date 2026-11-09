/**
 * Ponto de reposição = demanda média diária × prazo de reposição em dias
 * + estoque de segurança. Todas as quantidades devem usar a mesma unidade.
 * Não calcula compra, previsão de demanda, lote econômico ou estoque disponível.
 * Aceita frações e zero; retorna null para entradas inválidas ou overflow.
 */
export function calculateReorderPoint(
  averageDailyDemand: number,
  leadTimeDays: number,
  safetyStock: number = 0,
): number | null {
  if (![averageDailyDemand, leadTimeDays, safetyStock].every(
    value => typeof value === "number" && Number.isFinite(value) && value >= 0,
  )) return null;
  const point = averageDailyDemand * leadTimeDays + safetyStock;
  return Number.isFinite(point) ? point : null;
}

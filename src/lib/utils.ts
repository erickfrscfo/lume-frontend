export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Formata data como dd/mm/aaaa.
 * CORREÇÃO TIMEZONE: Trata a data como "date-only" (UTC) para evitar
 * que a conversão para fuso local (UTC-3) mude o dia.
 * Ex: "2026-04-07T00:00:00.000Z" deve exibir 07/04/2026, não 06/04/2026.
 */
export function formatDate(date: string): string {
  // Se a string contém 'T' ou 'Z', é ISO — extrair a parte da data diretamente
  if (date.includes('T') || date.includes('Z')) {
    const datePart = date.split('T')[0]; // "2026-04-07"
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }
  // Se já é formato "YYYY-MM-DD" sem timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }
  // Fallback: forçar interpretação como UTC
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
}

/**
 * Formata data curta (ex: "07 abr").
 * CORREÇÃO TIMEZONE: Mesma lógica de formatDate para evitar shift de dia.
 */
export function formatShortDate(date: string): string {
  // Forçar interpretação como UTC para evitar shift de dia
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(date));
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getMonthLabel(monthIndex: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[monthIndex] || '';
}

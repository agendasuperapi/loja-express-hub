export function normalizePhone(value: string | null | undefined): string {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function formatDisplayPhone(value: string | null | undefined): string {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  const withCC = digits.startsWith('55') ? digits : `55${digits}`;
  if (withCC.length <= 2) return `+${withCC}`;
  if (withCC.length <= 4) return `+${withCC.slice(0,2)} (${withCC.slice(2)}`;
  if (withCC.length <= 8) return `+${withCC.slice(0,2)} (${withCC.slice(2,4)}) ${withCC.slice(4)}`;
  if (withCC.length <= 12) return `+${withCC.slice(0,2)} (${withCC.slice(2,4)}) ${withCC.slice(4,8)}-${withCC.slice(8)}`;
  return `+${withCC.slice(0,2)} (${withCC.slice(2,4)}) ${withCC.slice(4,9)}-${withCC.slice(9)}`;
}

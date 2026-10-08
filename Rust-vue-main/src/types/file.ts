export function getFileUrl(value: string) {
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return value;
}

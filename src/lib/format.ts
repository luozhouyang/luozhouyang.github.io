export function formatCount(value: number): string {
  if (value >= 1000) {
    const compact = value / 1000;
    return `${compact >= 10 ? compact.toFixed(0) : compact.toFixed(1)}k`;
  }
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatMonth(value: string | Date, locale: 'zh' | 'en' = 'zh'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
  }).format(date);
}

export function formatDate(value: string | Date, locale: 'zh' | 'en' = 'zh'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function padIndex(index: number): string {
  return String(index + 1).padStart(2, '0');
}

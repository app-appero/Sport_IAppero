/** User-facing labels — never show upstream "*-oracle" ids in the UI. */
const PROVIDER_LABELS: Record<string, string> = {
  'soccer-oracle': 'Calcio',
  'tennis-oracle': 'Tennis',
  football: 'Calcio',
  tennis: 'Tennis',
};

export function providerLabel(provider?: string | null): string {
  if (!provider) return 'Sorgente dati';
  return PROVIDER_LABELS[provider] ?? 'Sorgente dati';
}

/** Display labels for prediction selections (Italian UI). */
export function selectionLabel(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (/^draw$/i.test(trimmed)) return 'Pareggio';
  return trimmed;
}

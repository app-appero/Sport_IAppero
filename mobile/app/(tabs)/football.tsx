import { SportScreen } from '@/components/SportScreen';

export default function FootballTab() {
  return (
    <SportScreen
      sport="football"
      title="Campionati e mercati"
      eyebrow="Football tab · soccer-oracle"
      emptyHint="Nessuna partita per la giornata selezionata."
      dateOptions={[
        // Default to a day with known fixtures so the first paint isn't an empty spinner.
        { label: '20 Sep', value: '2026-09-20' },
        { label: 'Today', value: undefined },
      ]}
    />
  );
}

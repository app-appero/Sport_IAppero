import { SportScreen } from '@/components/SportScreen';

export default function FootballTab() {
  return (
    <SportScreen
      sport="football"
      title="Campionati e mercati"
      eyebrow="Football tab · soccer-oracle"
      emptyHint="Nessuna partita per la giornata selezionata."
      dateOptions={[
        { label: 'Today', value: undefined },
        { label: '20 Sep', value: '2026-09-20' },
      ]}
    />
  );
}

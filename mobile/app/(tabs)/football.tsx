import { SportScreen } from '@/components/SportScreen';

export default function FootballTab() {
  return (
    <SportScreen
      sport="football"
      title="Campionati e mercati"
      eyebrow="Calcio"
      emptyHint="Nessuna partita per la giornata selezionata."
    />
  );
}

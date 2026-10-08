import { SportScreen } from '@/components/SportScreen';

export default function TennisTab() {
  return (
    <SportScreen
      sport="tennis"
      title="Tornei e mercati"
      eyebrow="Tennis tab · tennis-oracle"
      emptyHint="Nessuna prediction tennis disponibile al momento."
    />
  );
}

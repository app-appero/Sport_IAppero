import { SportScreen } from '@/components/SportScreen';

export default function TennisTab() {
  return (
    <SportScreen
      sport="tennis"
      title="Tornei e mercati"
      eyebrow="Tennis"
      emptyHint="Nessuna prediction tennis disponibile al momento."
    />
  );
}

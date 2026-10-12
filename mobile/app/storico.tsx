import { useLocalSearchParams } from 'expo-router';

import { HistoryScreen } from '@/components/HistoryScreen';

export default function StoricoRoute() {
  const { sport } = useLocalSearchParams<{ sport?: string }>();
  return <HistoryScreen initialSport={sport === 'tennis' ? 'tennis' : 'football'} />;
}

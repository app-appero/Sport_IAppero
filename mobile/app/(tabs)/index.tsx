import { SportScreen } from '@/components/SportScreen';

/** Default vista: Calcio, con menù a tendina per cambiare sport. */
export default function BrowseTab() {
  return <SportScreen initialSport="football" showSportDropdown />;
}

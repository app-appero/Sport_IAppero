import FootballTab from './football';

// Render Football directly instead of <Redirect /> so / never stays blank
// if client-side navigation fails in Simple Browser.
export default function Index() {
  return <FootballTab />;
}

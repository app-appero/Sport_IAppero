import { ProfileScreen } from '@/components/ProfileScreen';
import { SportThemeProvider } from '@/components/SportTheme';

export default function ProfiloRoute() {
  return (
    <SportThemeProvider sport="football">
      <ProfileScreen />
    </SportThemeProvider>
  );
}

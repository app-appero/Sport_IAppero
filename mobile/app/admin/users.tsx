import { AdminUsersScreen } from '@/components/AdminUsersScreen';
import { SportThemeProvider } from '@/components/SportTheme';

export default function AdminUsersRoute() {
  return (
    <SportThemeProvider sport="football">
      <AdminUsersScreen />
    </SportThemeProvider>
  );
}

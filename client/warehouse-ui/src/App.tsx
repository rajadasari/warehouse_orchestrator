import React, { useState, useEffect } from 'react';
import { LoginPage } from './features/auth/LoginPage';
import { SideNavBar } from './components/layout/SideNavBar';
import { UserManagementView } from './features/users/UserManagementView';

interface AuthSession {
  isLoggedIn: boolean;
  username: string;
  fullName: string;
  role: string;
}

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [session, setSession] = useState<AuthSession>({
    isLoggedIn: false,
    username: '',
    fullName: '',
    role: ''
  });

  // Sync theme with html root attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLoginSuccess = (user: { username: string; fullName: string; role: string }) => {
    setSession({
      isLoggedIn: true,
      username: user.username,
      fullName: user.fullName,
      role: user.role
    });
  };

  const handleLogout = () => {
    setSession({
      isLoggedIn: false,
      username: '',
      fullName: '',
      role: ''
    });
  };

  if (!session.isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-page)',
      color: 'var(--text-primary)'
    }}>
      {/* Side Navigation Bar matching Reference Image 3 */}
      <SideNavBar
        currentTheme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        activeItem="users"
        userName={session.fullName}
        userRole={session.role}
      />

      {/* Main Content Area - User Content Only as requested */}
      <main style={{
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        backgroundColor: 'var(--bg-page)',
        transition: 'background-color var(--transition-normal)'
      }}>
        <UserManagementView />
      </main>
    </div>
  );
};

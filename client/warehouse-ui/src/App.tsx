import React, { useState, useEffect } from 'react';
import { LoginPage } from './features/auth/LoginPage';
import { SideNavBar } from './components/layout/SideNavBar';
import { UserManagementView } from './features/users/UserManagementView';
import { MasterDataView } from './features/masterdata/MasterDataView';
import { PalletInventoryView } from './features/inventory/PalletInventoryView';
import { ResourceConfigView } from './features/resources/ResourceConfigView';
import { WmsFormsView } from './features/wms/WmsFormsView';
import { ApiMappingManagerView } from './features/mappings/ApiMappingManagerView';
import { WorkflowComposerView } from './features/workflows/WorkflowComposerView';
import { DatabaseSettingsView } from './features/configuration/DatabaseSettingsView';
import { NetworkGatewayView } from './features/network/NetworkGatewayView';
import { HandshakeAnalysisView } from './features/analysis/HandshakeAnalysisView';
import { StationTagInspectorView } from './features/analysis/StationTagInspectorView';
import { ErrorBoundary } from './components/common/ErrorBoundary';

interface AuthSession {
  isLoggedIn: boolean;
  username: string;
  fullName: string;
  role: string;
}

export type NavItemId = 
  | 'users' 
  | 'configuration' 
  | 'master-data' 
  | 'resource-manager'
  | 'template-definer'
  | 'resource-composer'
  | 'resource-config' 
  | 'api-mappings' 
  | 'workflows' 
  | 'database-config' 
  | 'inventory' 
  | 'custom-fields' 
  | 'network'
  | 'wms-forms'
  | 'analysis'
  | 'analysis-group'
  | 'station-tags';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activeNav, setActiveNav] = useState<NavItemId>('workflows');
  const [session, setSession] = useState<AuthSession>(() => {
    const saved = localStorage.getItem('warehouse_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore parse error
      }
    }
    return {
      isLoggedIn: false,
      username: '',
      fullName: '',
      role: ''
    };
  });

  // Sync theme with html root attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLoginSuccess = (user: { username: string; fullName: string; role: string }) => {
    const newSession: AuthSession = {
      isLoggedIn: true,
      username: user.username,
      fullName: user.fullName,
      role: user.role
    };
    setSession(newSession);
    localStorage.setItem('warehouse_session', JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession({
      isLoggedIn: false,
      username: '',
      fullName: '',
      role: ''
    });
    localStorage.removeItem('warehouse_session');
  };

  if (!session.isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-page)',
      color: 'var(--text-primary)'
    }}>
      {/* Side Navigation Bar with Master Data & Configuration integration */}
      <SideNavBar
        currentTheme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        activeItem={activeNav}
        onSelectNav={(item) => setActiveNav(item as any)}
        userName={session.fullName}
        userRole={session.role}
      />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-page)',
        transition: 'background-color var(--transition-normal)'
      }}>
        {(activeNav === 'configuration' || activeNav === 'master-data') && <MasterDataView />}
        {activeNav === 'template-definer' && <ResourceConfigView initialViewMode="TEMPLATES" />}
        {activeNav === 'resource-composer' && <ResourceConfigView initialViewMode="RESOURCES" />}
        {(activeNav === 'resource-manager' || activeNav === 'resource-config') && <ResourceConfigView initialViewMode="RESOURCES" />}
        {activeNav === 'api-mappings' && <ApiMappingManagerView />}
        {activeNav === 'workflows' && <WorkflowComposerView />}
        {activeNav === 'network' && <NetworkGatewayView />}
        {activeNav === 'database-config' && <DatabaseSettingsView />}
        {activeNav === 'users' && <UserManagementView />}
        {(activeNav === 'inventory' || activeNav === 'custom-fields') && <PalletInventoryView />}
        {activeNav === 'wms-forms' && <WmsFormsView />}
        {(activeNav === 'analysis' || activeNav === 'analysis-group') && (
          <ErrorBoundary fallbackTitle="Handshake Analysis Error">
            <HandshakeAnalysisView onNavigateToStationTags={() => setActiveNav('station-tags')} />
          </ErrorBoundary>
        )}
        {activeNav === 'station-tags' && (
          <ErrorBoundary fallbackTitle="Station Tag Inspector Error">
            <StationTagInspectorView onNavigateToHandshake={() => setActiveNav('analysis')} />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
};

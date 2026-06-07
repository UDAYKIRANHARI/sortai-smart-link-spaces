import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Sidebar, { type SpaceSummary } from './components/Sidebar';
import { Loader2 } from 'lucide-react';
import { ApiError, apiFetch } from './lib/api';

const ChatInterface = lazy(() => import('./components/ChatInterface'));
const SpaceView = lazy(() => import('./components/SpaceView'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login />;
  }

  return <AuthenticatedApp user={user} />;
}

function AuthenticatedApp({ user }: { user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null } }) {
  const { getIdToken, logout } = useAuth();
  const [activeView, setActiveView] = useState('chat');
  const [spaceSummary, setSpaceSummary] = useState<SpaceSummary>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchSpaceSummary = useCallback(async () => {
    try {
      const data = await apiFetch<Record<string, number>>('/api/spaces-summary', {
        tokenProvider: getIdToken,
      });
      const normalized: SpaceSummary = {};
      for (const [key, val] of Object.entries(data)) {
        normalized[key.toLowerCase()] = val as number;
      }
      setSpaceSummary(normalized);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
      }
      console.error('Failed to fetch space summary:', error);
    }
  }, [getIdToken, logout]);

  useEffect(() => {
    fetchSpaceSummary();
  }, [fetchSpaceSummary, refreshTrigger]);

  const handleLinkSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="h-screen flex bg-sortai-black relative overflow-hidden">
      <Sidebar
        spaceSummary={spaceSummary}
        activeView={activeView}
        onSelectView={setActiveView}
        user={{
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1 h-full overflow-hidden pl-0 lg:pl-0 relative">
        <Suspense fallback={<LoadingScreen />}>
          <div className={`h-full ${activeView === 'chat' ? 'block' : 'hidden'}`}>
            <ChatInterface onLinkSaved={handleLinkSaved} />
          </div>
          <div className={`h-full ${activeView !== 'chat' ? 'block' : 'hidden'}`}>
            {activeView !== 'chat' && (
              <SpaceView
                space={activeView}
                refreshTrigger={refreshTrigger}
                onLinkDeleted={handleLinkSaved}
              />
            )}
          </div>
        </Suspense>
      </main>

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            onClose={() => setSettingsOpen(false)}
            spaceSummary={spaceSummary}
          />
        </Suspense>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-sortai-black flex flex-col items-center justify-center">
      <img
        src="/SortAi-Logo.png"
        alt="SortAi"
        className="h-10 w-auto mb-8 animate-pulse"
        style={{ filter: 'invert(1)' }}
      />
      <Loader2 className="w-6 h-6 text-sortai-slate animate-spin" />
    </div>
  );
}

export default App;

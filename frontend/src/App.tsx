import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Sidebar, { type SpaceSummary } from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SpaceView from './components/SpaceView';
import { Loader2 } from 'lucide-react';
import SettingsModal from './components/SettingsModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
  const { getIdToken } = useAuth();
  const [activeView, setActiveView] = useState('chat');
  const [spaceSummary, setSpaceSummary] = useState<SpaceSummary>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchSpaceSummary = useCallback(async () => {
    try {
      const token = await getIdToken();
      const response = await fetch(
        `${API_URL}/api/spaces-summary?userId=${encodeURIComponent(user.uid)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        // If summary endpoint doesn't exist, try fetching all links and grouping
        const allLinksResponse = await fetch(
          `${API_URL}/api/links?userId=${encodeURIComponent(user.uid)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (allLinksResponse.ok) {
          const links = await allLinksResponse.json();
          if (Array.isArray(links)) {
            const summary: SpaceSummary = {};
            links.forEach((link: { space?: string }) => {
              const space = (link.space || 'other').toLowerCase();
              summary[space] = (summary[space] || 0) + 1;
            });
            setSpaceSummary(summary);
          }
        }
        return;
      }
      const data = await response.json();
      // Normalize keys to lowercase to match sidebar lookups
      const normalized: SpaceSummary = {};
      for (const [key, val] of Object.entries(data)) {
        normalized[key.toLowerCase()] = val as number;
      }
      setSpaceSummary(normalized);
    } catch (error) {
      console.error('Failed to fetch space summary:', error);
    }
  }, [user.uid, getIdToken]);

  useEffect(() => {
    fetchSpaceSummary();
  }, [fetchSpaceSummary, refreshTrigger]);

  const handleLinkSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="h-screen flex bg-sortai-black relative overflow-hidden">
      {/* Sidebar */}
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

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden pl-0 lg:pl-0 relative">
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
      </main>

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          spaceSummary={spaceSummary}
        />
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

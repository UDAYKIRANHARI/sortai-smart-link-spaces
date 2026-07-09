import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Sidebar, { type SpaceSummary } from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SpaceView from './components/SpaceView';
import SemanticSpaceView from './components/SemanticSpaceView';
import AdminDashboard from './components/AdminDashboard';
import { Loader2, CheckCircle2, MessageSquare, X } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import FeedbackModal from './components/FeedbackModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface RecentLink {
  id: string;
  url: string;
  title: string;
  space: string;
  source: string;
  tags: string[];
  shortDescription?: string;
  createdAt: string;
  confidence?: string;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading, getIdToken } = useAuth();
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: feedbackMsg, email: user?.email })
      });
      if (response.ok) {
        setIsFeedbackOpen(false);
        setFeedbackMsg('');
        alert('Thank you for your feedback!');
      } else {
        alert('Failed to submit feedback.');
      }
    } catch (e) {
      alert('Network error.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login />;
  }

  return <AuthenticatedApp 
    user={user} 
    isFeedbackOpen={isFeedbackOpen} 
    setIsFeedbackOpen={setIsFeedbackOpen} 
    feedbackMsg={feedbackMsg} 
    setFeedbackMsg={setFeedbackMsg} 
    submitFeedback={submitFeedback}
    isSubmittingFeedback={isSubmittingFeedback}
  />;
}

function AuthenticatedApp({ user, isFeedbackOpen, setIsFeedbackOpen, feedbackMsg, setFeedbackMsg, submitFeedback, isSubmittingFeedback }: any) {
  const { getIdToken } = useAuth();
  const [activeView, setActiveView] = useState('chat');
  const [spaceSummary, setSpaceSummary] = useState<SpaceSummary>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recentLinks, setRecentLinks] = useState<RecentLink[]>([]);
  const [semanticQuery, setSemanticQuery] = useState('');
  
  const isAdmin = user?.email === 'udaykiranhari07@gmail.com';
  
  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false);
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);
  
  // PWA Install Prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      return !isStandalone;
    }
    return true;
  });

  useEffect(() => {
    // Hide if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstallable(false);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) {
        setIsInstallable(true);
      }
    };
    
    const handleAppInstalled = () => {
      setShowInstallSuccess(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstallable(false);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener('change', handleDisplayModeChange);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("To install the app, click the install icon (monitor with a down arrow) located in the right side of your URL bar, or select 'Add to Home Screen' from your browser menu!");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallSuccess(true);
    }
    setDeferredPrompt(null);
  };

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
      const normalized: SpaceSummary = {};
      for (const [key, val] of Object.entries(data)) {
        normalized[key.toLowerCase()] = val as number;
      }
      setSpaceSummary(normalized);
    } catch (error) {
      console.error('Failed to fetch space summary:', error);
    }
  }, [user.uid, getIdToken]);

  const fetchRecentLinks = useCallback(async () => {
    try {
      const token = await getIdToken();
      const response = await fetch(
        `${API_URL}/api/links?userId=${encodeURIComponent(user.uid)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const links = await response.json();
        if (Array.isArray(links)) {
          const sorted = links
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map((item: any) => ({
              id: item.id || '',
              url: item.url || '',
              title: item.title || 'Untitled',
              space: item.space || 'Other',
              source: item.source || 'web',
              tags: item.tags || [],
              shortDescription: item.shortDescription || '',
              createdAt: item.createdAt || new Date().toISOString(),
              confidence: item.confidence || 'medium',
            }));
          setRecentLinks(sorted);
        }
      }
    } catch (error) {
      console.error('Failed to fetch recent links:', error);
    }
  }, [user.uid, getIdToken]);

  useEffect(() => {
    fetchSpaceSummary();
    fetchRecentLinks();
  }, [fetchSpaceSummary, fetchRecentLinks, refreshTrigger]);

  const handleLinkSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
    
    // Check feedback trigger
    const processed = parseInt(localStorage.getItem('sortai_processed_links') || '0');
    const newCount = processed + 1;
    localStorage.setItem('sortai_processed_links', newCount.toString());
    
    const feedbackGiven = localStorage.getItem('sortai_feedback_given') === 'true';
    if (newCount === 1 && !feedbackGiven) {
      setTimeout(() => setShowFeedback(true), 2000); // Show 2 seconds after first save
    }
  };

  const handleNavigateToChat = () => {
    setActiveView('chat');
  };

  const handleSmartSearch = (query: string) => {
    setSemanticQuery(query);
    setActiveView('search_results');
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
        isInstallable={isInstallable}
        onInstallClick={handleInstallClick}
        onSmartSearch={handleSmartSearch}
        isAdmin={isAdmin}
        onOpenAdmin={() => setActiveView('admin')}
        onOpenFeedback={() => setShowFeedback(true)}
      />

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden pl-0 lg:pl-0 relative">
        <div className={`h-full ${activeView === 'chat' ? 'block' : 'hidden'}`}>
          <ChatInterface onLinkSaved={handleLinkSaved} recentLinks={recentLinks} />
        </div>
        <div className={`h-full ${activeView === 'search_results' ? 'block' : 'hidden'}`}>
          <SemanticSpaceView 
            query={semanticQuery} 
            onLinkDeleted={handleLinkSaved} 
            onNavigateToChat={handleNavigateToChat} 
          />
        </div>
        <div className={`h-full ${activeView === 'admin' ? 'block' : 'hidden'}`}>
          <AdminDashboard />
        </div>
        <div className={`h-full ${activeView !== 'chat' && activeView !== 'search_results' && activeView !== 'admin' ? 'block' : 'hidden'}`}>
          {activeView !== 'chat' && activeView !== 'search_results' && activeView !== 'admin' && (
            <SpaceView
              space={activeView}
              refreshTrigger={refreshTrigger}
              onLinkDeleted={handleLinkSaved}
              onNavigateToChat={handleNavigateToChat}
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

      {/* Feedback Modal */}
      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          onSubmit={async (rating, text) => {
            localStorage.setItem('sortai_feedback_given', 'true');
            if (!text && rating > 0) text = `Rating: ${rating} stars`;
            setFeedbackMsg(text);
            try {
              const token = await getIdToken();
              await fetch(`${API_URL}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ message: text, email: user?.email })
              });
            } catch (e) {
              console.error('Failed to submit feedback', e);
            }
          }}
        />
      )}

      {/* Install Success Modal */}
      {showInstallSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in px-4">
          <div className="relative w-full max-w-sm bg-sortai-jet border border-sortai-slate/20 rounded-2xl shadow-2xl p-6 text-center">
             <div className="w-12 h-12 rounded-full bg-emerald-400/20 flex items-center justify-center mx-auto mb-4">
               <CheckCircle2 className="w-6 h-6 text-emerald-400" />
             </div>
             <h3 className="font-heading text-lg font-semibold text-sortai-white mb-2">
               App Installed Successfully!
             </h3>
             <p className="text-sm text-sortai-silver mb-6">
               Thank you, you just solved your problem by installing! You can now access SortAi directly from your home screen or desktop.
             </p>
             <button
               onClick={() => setShowInstallSuccess(false)}
               className="w-full py-2.5 rounded-xl bg-sortai-white text-sortai-black font-semibold hover:bg-sortai-silver transition-colors"
             >
               Awesome
             </button>
          </div>
        </div>
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

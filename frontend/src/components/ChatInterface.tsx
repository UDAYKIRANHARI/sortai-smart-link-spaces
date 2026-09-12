import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Send,
  Link as LinkIcon,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  RotateCcw,
  Globe,
  ChevronDown,
  Zap,
  Search as SearchIcon,
  Brain,
  FolderOpen,
  ArrowRight,
  Clock,
} from 'lucide-react';
import StarfieldBackground from './StarfieldBackground';
import { ContextSurfaceBanner } from './ContextSurfaceBanner';
import { NotificationPrompt } from './NotificationPrompt';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const VALID_SPACES = [
  'Career', 'Study', 'Fashion', 'Fitness', 'Tech',
  'Tools', 'Web links', 'Entertainment', 'Life', 'Other',
];

const SPACE_BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  career: { bg: 'bg-space-career/10', text: 'text-space-career', border: 'border-space-career/25' },
  study: { bg: 'bg-space-study/10', text: 'text-space-study', border: 'border-space-study/25' },
  fashion: { bg: 'bg-space-fashion/10', text: 'text-space-fashion', border: 'border-space-fashion/25' },
  fitness: { bg: 'bg-space-fitness/10', text: 'text-space-fitness', border: 'border-space-fitness/25' },
  tech: { bg: 'bg-space-tech/10', text: 'text-space-tech', border: 'border-space-tech/25' },
  tools: { bg: 'bg-space-tools/10', text: 'text-space-tools', border: 'border-space-tools/25' },
  'web links': { bg: 'bg-space-weblinks/10', text: 'text-space-weblinks', border: 'border-space-weblinks/25' },
  entertainment: { bg: 'bg-space-entertainment/10', text: 'text-space-entertainment', border: 'border-space-entertainment/25' },
  life: { bg: 'bg-space-life/10', text: 'text-space-life', border: 'border-space-life/25' },
  other: { bg: 'bg-space-other/10', text: 'text-space-other', border: 'border-space-other/25' },
};

function getSourceClass(source: string): string {
  const key = source.toLowerCase().replace(/\.com$/, '');
  const map: Record<string, string> = {
    youtube: 'source-youtube',
    github: 'source-github',
    instagram: 'source-instagram',
    tiktok: 'source-tiktok',
    linkedin: 'source-linkedin',
    web: 'source-web',
  };
  return map[key] || 'source-default';
}

function getSourceLabel(source: string): string {
  const key = source.toLowerCase().replace(/\.com$/, '');
  const labels: Record<string, string> = {
    youtube: '▶ YouTube',
    github: '⌘ GitHub',
    instagram: '📷 Instagram',
    tiktok: '♪ TikTok',
    linkedin: '💼 LinkedIn',
    facebook: '📘 Facebook',
    web: '🌐 Web',
    other: '🔗 Link',
  };
  return labels[key] || labels.other;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ClassifiedLink {
  id?: string;
  title: string;
  description: string;
  space: string;
  tags: string[];
  source: string;
  confidence: string;
  url: string;
  reasonToSave?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  createdAt?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'loading' | 'error';
  content: string;
  linkData?: ClassifiedLink;
  timestamp: Date;
  failedUrl?: string;
}

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

interface ChatInterfaceProps {
  onLinkSaved: () => void;
  recentLinks?: RecentLink[];
  onShowPricing?: (reason: 'MONTHLY_LINK_LIMIT' | 'VISION_AI_LIMIT' | 'manual') => void;
  userUsage?: { tier: string; monthlyLinkCount: number; visionAiCount: number };
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const EXAMPLE_LINKS = [
  { url: 'https://youtu.be/dQw4w9WgXcQ', label: 'Try a YouTube video', icon: '▶' },
  { url: 'https://github.com/facebook/react', label: 'Try a GitHub repo', icon: '⌘' },
  { url: 'https://dev.to/t/javascript', label: 'Try a dev article', icon: '📄' },
];

export default function ChatInterface({ onLinkSaved, recentLinks = [], onShowPricing, userUsage }: ChatInterfaceProps) {
  const { user, getIdToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat history from localStorage on mount / user switch
  useEffect(() => {
    if (user?.uid) {
      const stored = localStorage.getItem(`sortai_chat_${user.uid}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const converted = parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(converted);
        } catch (e) {
          console.error('Failed to parse chat history:', e);
        }
      } else {
        setMessages([]);
      }
    }
  }, [user?.uid]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (user?.uid) {
      if (messages.length > 0) {
        localStorage.setItem(`sortai_chat_${user.uid}`, JSON.stringify(messages));
      } else {
        localStorage.removeItem(`sortai_chat_${user.uid}`);
      }
    }
  }, [messages, user?.uid]);

  const handleNewChat = () => {
    setMessages([]);
  };

  const submitUrl = async (url: string) => {
    if (!url || isProcessing) return;

    if (!isValidUrl(url)) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'error',
          content: 'That doesn\'t look like a valid URL. Make sure it starts with http:// or https://',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: url,
      timestamp: new Date(),
    };

    const loadingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'loading',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url, userId: user?.uid }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        
        // Intercept paywall errors
        if (response.status === 403 && errData.code === 'MONTHLY_LINK_LIMIT') {
          onShowPricing?.('MONTHLY_LINK_LIMIT');
          setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id));
          setIsProcessing(false);
          return;
        }
        if (response.status === 403 && errData.code === 'VISION_AI_LIMIT') {
          onShowPricing?.('VISION_AI_LIMIT');
          setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id));
          setIsProcessing(false);
          return;
        }
        
        const errMsg = errData.error || errData.details || `Server returned ${response.status}`;
        throw new Error(errMsg);
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        type: 'assistant',
        content: '',
        linkData: {
          id: data.id,
          title: data.title || 'Untitled',
          description: data.shortDescription || data.description || '',
          space: data.space || 'Other',
          tags: data.tags || [],
          source: data.source || 'web',
          confidence: data.confidence || 'medium',
          url: url,
          reasonToSave: data.reasonToSave || data.reason_to_save || '',
          thumbnailUrl: data.thumbnailUrl || '',
          imageUrl: data.imageUrl || '',
          createdAt: data.createdAt || new Date().toISOString(),
        },
        timestamp: new Date(),
      };

      setMessages((prev) =>
        prev.filter((m) => m.id !== loadingMsg.id).concat(assistantMsg)
      );

      onLinkSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      let friendlyMessage = message;

      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        friendlyMessage = 'Could not reach the server. Check your connection and try again.';
      } else if (message.includes('401') || message.includes('403')) {
        friendlyMessage = 'Session expired. Please log in again.';
      } else if (message.includes('503') || message.includes('unavailable')) {
        friendlyMessage = 'AI classification service is temporarily unavailable. Try again in a moment.';
      } else if (message.includes('scrape') || message.includes('metadata')) {
        friendlyMessage = 'Couldn\'t read this page. The site might block automated access.';
      }

      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        type: 'error',
        content: friendlyMessage,
        timestamp: new Date(),
        failedUrl: url,
      };

      setMessages((prev) =>
        prev.filter((m) => m.id !== loadingMsg.id).concat(errorMsg)
      );
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  // Safe ref to call submitUrl from the share-target useEffect without dependency cycles
  const submitUrlRef = useRef(submitUrl);
  useEffect(() => {
    submitUrlRef.current = submitUrl;
  }, [submitUrl]);

  // Actually process the shared link here using the ref
  useEffect(() => {
    if (!user?.uid) return;
    
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;

    const sharedUrl = params.get('url');
    const sharedText = params.get('text');
    
    let extractedUrl = '';
    if (sharedUrl && isValidUrl(sharedUrl)) {
      extractedUrl = sharedUrl;
    } else if (sharedText) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = sharedText.match(urlRegex);
      if (matches && matches.length > 0) {
        extractedUrl = matches[0];
      }
    }
    
    if (extractedUrl) {
      // Clear the URL parameters so it doesn't trigger again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      setInput(extractedUrl);
      
      // Use the ref to safely call the latest submitUrl function
      // adding a tiny delay to let UI settle
      setTimeout(() => {
        submitUrlRef.current(extractedUrl);
      }, 300);
    }
  }, [user?.uid]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await submitUrl(input.trim());
  };

  const handleTryExample = (url: string) => {
    setInput(url);
    submitUrl(url);
  };

  const handleRetry = (url: string) => {
    submitUrl(url);
  };

  return (
    <div className="flex flex-col h-full bg-sortai-black relative overflow-hidden">
      <StarfieldBackground />

      {/* ── Chat Header ── */}
      <header className="relative z-10 flex items-center justify-between border-b border-sortai-slate/10 bg-sortai-jet/80 backdrop-blur-md px-6 py-4 flex-shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          {messages.length > 0 ? (
            <MascotOrb size="small" />
          ) : (
            <Sparkles className="w-[18px] h-[18px] text-sortai-silver animate-pulse-glow" />
          )}
          <h2 className="font-heading text-sm font-semibold tracking-wide text-sortai-white flex items-center gap-2">
            Link Assistant
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sortai-white/10 text-sortai-silver border border-sortai-slate/20 tracking-wider uppercase leading-none">BETA</span>
            {userUsage?.tier !== 'pro' && userUsage?.tier !== 'loading' && (
              <button
                onClick={() => onShowPricing && onShowPricing('manual')}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gradient-to-r from-emerald-400/20 to-blue-500/20 text-emerald-400 border border-emerald-400/30 tracking-wider uppercase leading-none hover:bg-emerald-400/30 transition-all cursor-pointer ml-1"
              >
                <Zap className="w-3 h-3" /> Upgrade
              </button>
            )}
          </h2>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sortai-white/[0.05] border border-sortai-slate/10 text-xs text-sortai-silver
                       hover:text-sortai-white hover:bg-sortai-white/[0.1] hover:border-sortai-slate/30 transition-all duration-200 active:scale-95 h-8"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        )}
      </header>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 relative z-10">
        <div className="max-w-2xl mx-auto">
          <ContextSurfaceBanner getIdToken={getIdToken} apiUrl={API_URL} />
          <NotificationPrompt getIdToken={getIdToken} apiUrl={API_URL} />
        </div>
        {messages.length === 0 ? (
          <WelcomeState
            onTryExample={handleTryExample}
            recentLinks={recentLinks}
          />
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                onRetry={handleRetry} 
                onLinkSaved={onLinkSaved} 
                onSpaceChanged={(id, space) => {
                  setMessages(prev => prev.map(m => 
                    m.linkData?.id === id ? { ...m, linkData: { ...m.linkData, space } } : m
                  ));
                }}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input Bar ── */}
      <div className="border-t border-sortai-slate/10 bg-sortai-black/80 backdrop-blur-md px-4 md:px-6 py-4 relative z-10">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-sortai-jet border border-sortai-slate/15
                          focus-within:border-sortai-slate/40 transition-colors">
            <LinkIcon className="w-4 h-4 text-sortai-slate flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a link to save & classify..."
              disabled={isProcessing}
              className="flex-1 bg-transparent text-sm text-sortai-pale placeholder:text-sortai-slate/50
                         focus:outline-none disabled:opacity-50 py-1.5"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="p-2 rounded-xl bg-sortai-white/[0.08] text-sortai-silver
                         hover:bg-sortai-white/[0.15] hover:text-sortai-white
                         disabled:opacity-30 disabled:cursor-not-allowed
                         active:scale-95 transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═════════════════════════════════
   Sub-Components
   ═════════════════════════════════ */

interface MascotOrbProps {
  size?: 'small' | 'large';
}

function MascotOrb({ size = 'large' }: MascotOrbProps) {
  const mascotRef = useRef<HTMLDivElement>(null);
  const leftPupilRef = useRef<HTMLDivElement>(null);
  const rightPupilRef = useRef<HTMLDivElement>(null);

  const isSmall = size === 'small';
  const containerSizeClass = isSmall ? 'w-8 h-8' : 'w-20 h-20';
  const scleraSizeClass = isSmall ? 'w-[7.5px] h-[9.5px]' : 'w-[18px] h-[22px]';
  const pupilSizeClass = isSmall ? 'w-[4px] h-[5px]' : 'w-[10px] h-[12px]';
  const gapClass = isSmall ? 'gap-0.5' : 'gap-2.5';
  const marginClass = isSmall ? 'mt-0.5' : 'mt-1';
  const reflectionHeightClass = isSmall ? 'w-5 h-2 top-0.5 left-1 blur-[0.2px]' : 'w-12 h-5 top-1.5 left-3 blur-[0.5px]';
  const glintSizeClass = isSmall ? 'w-0.5 h-0.5 top-0.5 left-0.5' : 'w-1.5 h-1.5 top-0.5 left-0.5';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const mascot = mascotRef.current;
      if (!mascot) return;
      const rect = mascot.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDisplacement = isSmall ? 1.5 : 4.5;
      const factor = isSmall ? 0.02 : 0.04;
      const moveX = distance === 0 ? 0 : (dx / distance) * Math.min(maxDisplacement, distance * factor);
      const moveY = distance === 0 ? 0 : (dy / distance) * Math.min(maxDisplacement, distance * factor);
      if (leftPupilRef.current) leftPupilRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
      if (rightPupilRef.current) rightPupilRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isSmall]);

  return (
    <div
      ref={mascotRef}
      className={`${containerSizeClass} rounded-full relative border border-sortai-slate/30 shadow-2xl shadow-black/90 overflow-hidden select-none flex items-center justify-center ${gapClass} z-10`}
      style={{ background: 'radial-gradient(circle at 35% 35%, #444 0%, #151515 55%, #050505 100%)' }}
    >
      <div className={`absolute rounded-full bg-gradient-to-b from-white/[0.18] to-transparent pointer-events-none ${reflectionHeightClass}`} style={{ transform: 'rotate(-12deg)' }} />
      {!isSmall && (
        <div className="absolute bottom-1 right-2 w-10 h-4 rounded-full bg-gradient-to-t from-white/[0.04] to-transparent blur-[1px] pointer-events-none" style={{ transform: 'rotate(25deg)' }} />
      )}
      <div className={`flex ${gapClass} z-10 ${marginClass}`}>
        <div className={`${scleraSizeClass} bg-sortai-white rounded-full flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]`}>
          <div ref={leftPupilRef} className={`${pupilSizeClass} bg-sortai-black rounded-full relative flex items-start justify-start`} style={{ transition: 'transform 0.05s ease-out' }}>
            <div className={`rounded-full bg-white absolute opacity-90 ${glintSizeClass}`} />
          </div>
        </div>
        <div className={`${scleraSizeClass} bg-sortai-white rounded-full flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]`}>
          <div ref={rightPupilRef} className={`${pupilSizeClass} bg-sortai-black rounded-full relative flex items-start justify-start`} style={{ transition: 'transform 0.05s ease-out' }}>
            <div className={`rounded-full bg-white absolute opacity-90 ${glintSizeClass}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Welcome State with examples + recent links ── */

function WelcomeState({ onTryExample, recentLinks }: { onTryExample: (url: string) => void; recentLinks: RecentLink[] }) {
  return (
    <div className="flex flex-col items-center h-full relative z-10 select-none overflow-y-auto">
      {/* Hero area */}
      <div className="flex flex-col items-center text-center px-4 pt-8 pb-6 animate-fade-in">
        <div className="relative mb-6 animate-float flex flex-col items-center">
          <div className="absolute w-24 h-24 rounded-full bg-sortai-white/10 blur-xl opacity-60 scale-125 pointer-events-none" />
          <MascotOrb />
        </div>

        <h2 className="font-heading text-xl md:text-2xl font-semibold text-sortai-white mb-2">
          Welcome to SortAi
        </h2>
        <p className="text-sortai-silver text-sm max-w-md leading-relaxed mb-6">
          Paste any link below — YouTube, GitHub, articles, social media — and AI will analyze it, classify it into the right space, and save it for you.
        </p>

        {/* How it works */}
        <div className="flex items-center gap-2 mb-8 flex-wrap justify-center">
          {[
            { icon: LinkIcon, label: 'Paste link' },
            { icon: Brain, label: 'AI analyzes' },
            { icon: FolderOpen, label: 'Auto-classified' },
            { icon: CheckCircle2, label: 'Saved & organized' },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sortai-jet border border-sortai-slate/10">
                <step.icon className="w-3 h-3 text-sortai-silver" />
                <span className="text-[11px] text-sortai-pale">{step.label}</span>
              </div>
              {i < 3 && <ArrowRight className="w-3 h-3 text-sortai-slate/40 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* Try with example */}
        <div className="mb-8 w-full max-w-md">
          <p className="text-[11px] uppercase tracking-wider text-sortai-slate font-semibold mb-3">Try with an example</p>
          <div className="flex flex-col gap-2">
            {EXAMPLE_LINKS.map((ex) => (
              <button
                key={ex.url}
                onClick={() => onTryExample(ex.url)}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-sortai-jet/60 border border-sortai-slate/10
                           hover:bg-sortai-jet hover:border-sortai-slate/25 transition-all duration-200 text-left"
              >
                <span className="text-base flex-shrink-0">{ex.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-sortai-pale group-hover:text-sortai-white transition-colors">{ex.label}</span>
                  <span className="block text-[11px] text-sortai-slate truncate">{ex.url}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-sortai-slate opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recently Saved section */}
      {recentLinks.length > 0 && (
        <div className="w-full max-w-md px-4 pb-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-sortai-slate" />
            <p className="text-[11px] uppercase tracking-wider text-sortai-slate font-semibold">Recently Organized</p>
          </div>
          <div className="space-y-2">
            {recentLinks.slice(0, 5).map((link) => {
              const spaceColors = SPACE_BADGE_COLORS[link.space.toLowerCase()] || SPACE_BADGE_COLORS.other;
              return (
                <div
                  key={link.id}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-sortai-jet/50 border border-sortai-slate/8
                             hover:bg-sortai-jet hover:border-sortai-slate/20 transition-all duration-200 cursor-pointer group"
                  onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                >
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${spaceColors.bg} ${spaceColors.text} ${spaceColors.border}`}>
                    {link.space}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-sortai-pale truncate group-hover:text-sortai-white transition-colors">{link.title}</p>
                  </div>
                  <span className="text-[10px] text-sortai-slate flex-shrink-0">{timeAgo(link.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Message Bubble Router ── */

function MessageBubble({ message, onRetry, onLinkSaved, onSpaceChanged }: { message: ChatMessage; onRetry: (url: string) => void; onLinkSaved: () => void; onSpaceChanged: (id: string, space: string) => void }) {
  switch (message.type) {
    case 'user':
      return <UserBubble content={message.content} />;
    case 'loading':
      return <LoadingBubble />;
    case 'assistant':
      return message.linkData ? <AssistantBubble linkData={message.linkData} onLinkSaved={onLinkSaved} onSpaceChanged={onSpaceChanged} /> : null;
    case 'error':
      return <ErrorBubble content={message.content} failedUrl={message.failedUrl} onRetry={onRetry} />;
    default:
      return null;
  }
}

/* ── User Bubble ── */

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end animate-slide-up">
      <div className="max-w-md px-4 py-3 rounded-2xl rounded-tr-md bg-sortai-jet border border-sortai-slate/15">
        <div className="flex items-center gap-2">
          <LinkIcon className="w-3.5 h-3.5 text-sortai-slate flex-shrink-0" />
          <span className="text-sm text-sortai-pale break-all">{content}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Multi-Step Loading Bubble ── */

function LoadingBubble() {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: SearchIcon, label: 'Detecting source…' },
    { icon: Globe, label: 'Extracting metadata…' },
    { icon: Brain, label: 'AI is classifying…' },
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-md w-full px-5 py-4 rounded-2xl rounded-tl-md glass">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-sortai-silver animate-pulse-glow" />
          <span className="text-sm font-medium text-sortai-silver">Processing your link</span>
        </div>
        <div className="space-y-2.5">
          {steps.map((s, i) => {
            const isDone = i < step;
            const isActive = i === step;
            const isPending = i > step;
            return (
              <div
                key={s.label}
                className={`flex items-center gap-2.5 transition-all duration-300 ${isPending ? 'opacity-30' : 'opacity-100'}`}
                style={isActive ? { animation: 'stepReveal 0.4s ease-out forwards' } : undefined}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-check-in flex-shrink-0" />
                ) : isActive ? (
                  <s.icon className="w-4 h-4 text-sortai-silver animate-pulse-glow flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-sortai-slate/30 flex-shrink-0" />
                )}
                <span className={`text-[13px] ${isDone ? 'text-sortai-pale' : isActive ? 'text-sortai-silver' : 'text-sortai-slate'}`}>
                  {isDone ? s.label.replace('…', '') : s.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 h-0.5 bg-sortai-slate/10 rounded-full overflow-hidden">
          <div className="h-full bg-sortai-silver/40 rounded-full progress-fill" />
        </div>
      </div>
    </div>
  );
}

/* ── Rich Result Card (AssistantBubble) ── */

function AssistantBubble({ linkData, onLinkSaved, onSpaceChanged }: { linkData: ClassifiedLink; onLinkSaved: () => void; onSpaceChanged: (id: string, space: string) => void }) {
  const { user, getIdToken } = useAuth();
  const [selectedSpace, setSelectedSpace] = useState(linkData.space);
  const [isMoving, setIsMoving] = useState(false);
  const [moved, setMoved] = useState(false);
  const spaceColors = SPACE_BADGE_COLORS[selectedSpace.toLowerCase()] || SPACE_BADGE_COLORS.other;
  const sourceClass = getSourceClass(linkData.source);
  const sourceLabel = getSourceLabel(linkData.source);
  const hasThumbnail = linkData.thumbnailUrl || linkData.imageUrl;

  const handleMoveSpace = async (newSpace: string) => {
    if (newSpace === selectedSpace || !linkData.id || !user) return;
    setIsMoving(true);
    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/api/links/${linkData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ space: newSpace }),
      });
      if (response.ok) {
        setSelectedSpace(newSpace);
        setMoved(true);
        onLinkSaved();
        onSpaceChanged(linkData.id, newSpace);
        setTimeout(() => setMoved(false), 2000);
      }
    } catch (e) {
      console.error('Failed to move link:', e);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-md w-full rounded-2xl rounded-tl-md glass overflow-hidden animate-success-pop">
        {/* Thumbnail */}
        {hasThumbnail && (
          <div className="relative w-full aspect-video overflow-hidden bg-sortai-black">
            <img
              src={linkData.thumbnailUrl || linkData.imageUrl}
              alt={linkData.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-sortai-jet/90 via-transparent to-transparent" />
            {/* Source badge overlay */}
            <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${sourceClass}`}>
              {sourceLabel}
            </span>
          </div>
        )}

        <div className="p-5 space-y-3">
          {/* Source + confidence row (only if no thumbnail) */}
          {!hasThumbnail && (
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${sourceClass}`}>
                {sourceLabel}
              </span>
              <span className="text-[10px] text-sortai-slate capitalize flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  linkData.confidence === 'high' ? 'bg-emerald-400' :
                  linkData.confidence === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
                {linkData.confidence} confidence
              </span>
            </div>
          )}

          {/* Space badge as an inline interactive dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            {linkData.id ? (
              <div className="relative group">
                <select
                  value={selectedSpace}
                  onChange={(e) => handleMoveSpace(e.target.value)}
                  disabled={isMoving}
                  className={`appearance-none cursor-pointer outline-none focus:outline-none transition-all duration-200
                              px-2.5 py-1 pr-6 rounded-lg text-[11px] font-semibold uppercase tracking-wider border 
                              ${spaceColors.bg} ${spaceColors.text} ${spaceColors.border}
                              hover:brightness-110 disabled:opacity-50`}
                >
                  {VALID_SPACES.map((s) => (
                    <option key={s} value={s} className="bg-sortai-jet text-sortai-silver capitalize">{s}</option>
                  ))}
                </select>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                  <ChevronDown className={`w-3 h-3 ${spaceColors.text}`} />
                </div>
              </div>
            ) : (
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider border ${spaceColors.bg} ${spaceColors.text} ${spaceColors.border}`}>
                {selectedSpace}
              </span>
            )}
            
            {hasThumbnail && (
              <span className="text-[10px] text-sortai-slate capitalize flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  linkData.confidence === 'high' ? 'bg-emerald-400' :
                  linkData.confidence === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
                {linkData.confidence}
              </span>
            )}
            
            {moved && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 ml-auto animate-fade-in">
                <CheckCircle2 className="w-3 h-3" /> Saved to {selectedSpace}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="font-heading text-[15px] font-medium text-sortai-white leading-snug">
            {linkData.title}
          </h4>

          {/* Description */}
          {linkData.description && (
            <p className="text-[13px] text-sortai-pale/80 leading-relaxed">
              {linkData.description}
            </p>
          )}

          {/* AI reasoning */}
          {linkData.reasonToSave && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-sortai-black/30 border border-sortai-slate/8">
              <Zap className="w-3.5 h-3.5 text-sortai-silver flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-sortai-silver leading-relaxed italic">
                {linkData.reasonToSave}
              </p>
            </div>
          )}

          {/* Tags */}
          {linkData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {linkData.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] rounded-md bg-sortai-black/50 border border-sortai-slate/15 text-sortai-slate"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Success state */}
          <div className="flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70" />
            <span className="text-[11px] text-sortai-slate">
              {moved ? (
                <span className="text-emerald-400">Moved to <span className="font-medium">{selectedSpace}</span></span>
              ) : (
                <>Saved to <span className="text-sortai-silver font-medium">{selectedSpace}</span></>
              )}
            </span>
            {linkData.createdAt && (
              <span className="text-[10px] text-sortai-slate/60 ml-auto">{timeAgo(linkData.createdAt)}</span>
            )}
          </div>
        </div>

        {/* Open Link Button */}
        <button
          onClick={() => window.open(linkData.url, '_blank', 'noopener,noreferrer')}
          className="w-full flex items-center justify-center gap-2 py-3 border-t border-sortai-slate/10
                     text-sm text-sortai-silver hover:text-sortai-white hover:bg-sortai-white/[0.03]
                     transition-all duration-200"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Link
        </button>
      </div>
    </div>
  );
}

/* ── Error Bubble with Retry ── */

function ErrorBubble({ content, failedUrl, onRetry }: { content: string; failedUrl?: string; onRetry: (url: string) => void }) {
  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-md px-4 py-3 rounded-2xl rounded-tl-md bg-red-500/10 border border-red-500/20">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-sm text-red-300 block">{content}</span>
            {failedUrl && (
              <button
                onClick={() => onRetry(failedUrl)}
                className="mt-2 flex items-center gap-1.5 text-[12px] text-red-400 hover:text-red-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

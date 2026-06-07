import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiFetch } from '../lib/api';
import {
  Send,
  Link as LinkIcon,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import StarfieldBackground from './StarfieldBackground';

const SPACE_BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  career: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  study: { bg: 'bg-sortai-jet', text: 'text-sortai-white', border: 'border-sortai-silver/20' },
  fashion: { bg: 'bg-sortai-jet', text: 'text-sortai-silver', border: 'border-sortai-slate/20' },
  fitness: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  tech: { bg: 'bg-sortai-white/10', text: 'text-sortai-white', border: 'border-sortai-silver/30' },
  tools: { bg: 'bg-sortai-jet', text: 'text-sortai-silver', border: 'border-sortai-slate/20' },
  'web links': { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  entertainment: { bg: 'bg-sortai-jet', text: 'text-sortai-silver', border: 'border-sortai-slate/20' },
  life: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  other: { bg: 'bg-sortai-jet', text: 'text-sortai-slate', border: 'border-sortai-slate/10' },
};

interface ClassifiedLink {
  title: string;
  description: string;
  space: string;
  tags: string[];
  source: string;
  confidence: string;
  url: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'loading' | 'error';
  content: string;
  linkData?: ClassifiedLink;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onLinkSaved: () => void;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ChatInterface({ onLinkSaved }: ChatInterfaceProps) {
  const { user, getIdToken, logout } = useAuth();
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const url = input.trim();
    if (!url || isProcessing) return;

    if (!isValidUrl(url)) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'error',
          content: 'Please enter a valid URL (starting with http:// or https://)',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: url,
      timestamp: new Date(),
    };

    const loadingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'loading',
      content: 'Analyzing & classifying...',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const data = await apiFetch<{
        title?: string;
        shortDescription?: string;
        description?: string;
        space?: string;
        tags?: string[];
        source?: string;
        confidence?: string;
      }>('/api/links', {
        method: 'POST',
        tokenProvider: getIdToken,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        type: 'assistant',
        content: '',
        linkData: {
          title: data.title || 'Untitled',
          description: data.shortDescription || data.description || '',
          space: data.space || 'other',
          tags: data.tags || [],
          source: data.source || '',
          confidence: data.confidence || 'medium',
          url: url,
        },
        timestamp: new Date(),
      };

      // Replace loading message with assistant response
      setMessages((prev) =>
        prev.filter((m) => m.id !== loadingMsg.id).concat(assistantMsg)
      );

      onLinkSaved();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
      }

      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        type: 'error',
        content: error instanceof Error ? error.message : 'Failed to classify link. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) =>
        prev.filter((m) => m.id !== loadingMsg.id).concat(errorMsg)
      );
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full bg-sortai-black relative overflow-hidden">
      {/* Interactive Starfield Background */}
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
          </h2>
        </div>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sortai-white/[0.05] border border-sortai-slate/10 text-xs text-sortai-silver
                     hover:text-sortai-white hover:bg-sortai-white/[0.1] hover:border-sortai-slate/30 transition-all duration-200 active:scale-95 h-8 animate-fade-in"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>
      </header>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 relative z-10">
        {messages.length === 0 ? (
          <WelcomeState />
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
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

      if (leftPupilRef.current) {
        leftPupilRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
      if (rightPupilRef.current) {
        rightPupilRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isSmall]);

  return (
    <div
      ref={mascotRef}
      className={`${containerSizeClass} rounded-full relative border border-sortai-slate/30 shadow-2xl shadow-black/90 overflow-hidden select-none flex items-center justify-center ${gapClass} z-10`}
      style={{
        background: 'radial-gradient(circle at 35% 35%, #444 0%, #151515 55%, #050505 100%)',
      }}
    >
      {/* Gloss reflection overlay at the top left */}
      <div
        className={`absolute rounded-full bg-gradient-to-b from-white/[0.18] to-transparent pointer-events-none ${reflectionHeightClass}`}
        style={{ transform: 'rotate(-12deg)' }}
      />
      {/* Lower gloss glow at bottom right (only for large size) */}
      {!isSmall && (
        <div
          className="absolute bottom-1 right-2 w-10 h-4 rounded-full bg-gradient-to-t from-white/[0.04] to-transparent blur-[1px] pointer-events-none"
          style={{ transform: 'rotate(25deg)' }}
        />
      )}

      {/* Eyes Container */}
      <div className={`flex ${gapClass} z-10 ${marginClass}`}>
        {/* Left Sclera */}
        <div className={`${scleraSizeClass} bg-sortai-white rounded-full flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]`}>
          {/* Left Pupil */}
          <div
            ref={leftPupilRef}
            className={`${pupilSizeClass} bg-sortai-black rounded-full relative flex items-start justify-start`}
            style={{ transition: 'transform 0.05s ease-out' }}
          >
            {/* Pupil Glint */}
            <div className={`rounded-full bg-white absolute opacity-90 ${glintSizeClass}`} />
          </div>
        </div>

        {/* Right Sclera */}
        <div className={`${scleraSizeClass} bg-sortai-white rounded-full flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]`}>
          {/* Right Pupil */}
          <div
            ref={rightPupilRef}
            className={`${pupilSizeClass} bg-sortai-black rounded-full relative flex items-start justify-start`}
            style={{ transition: 'transform 0.05s ease-out' }}
          >
            {/* Pupil Glint */}
            <div className={`rounded-full bg-white absolute opacity-90 ${glintSizeClass}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in relative z-10 select-none">
      {/* Floating Mascot glossy black orb */}
      <div className="relative mb-6 animate-float flex flex-col items-center">
        {/* Glow */}
        <div className="absolute w-24 h-24 rounded-full bg-sortai-white/10 blur-xl opacity-60 scale-125 pointer-events-none" />
        <MascotOrb />
      </div>

      <h2 className="font-heading text-xl md:text-2xl font-semibold text-sortai-white mb-3 flex items-center gap-2">
        Welcome to SortAi
      </h2>
      <p className="text-sortai-silver text-sm max-w-sm leading-relaxed mb-8">
        Paste any link below and I'll analyze, classify, and save it into the right space for you — powered by AI.
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {['YouTube', 'Articles', 'GitHub', 'Social Media', 'News'].map((example) => (
          <span
            key={example}
            className="px-3 py-1.5 rounded-lg text-[12px] bg-sortai-jet border border-sortai-slate/10 text-sortai-slate"
          >
            {example}
          </span>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  switch (message.type) {
    case 'user':
      return <UserBubble content={message.content} />;
    case 'loading':
      return <LoadingBubble />;
    case 'assistant':
      return message.linkData ? <AssistantBubble linkData={message.linkData} /> : null;
    case 'error':
      return <ErrorBubble content={message.content} />;
    default:
      return null;
  }
}

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

function LoadingBubble() {
  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-md px-5 py-4 rounded-2xl rounded-tl-md glass">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-4 h-4 text-sortai-silver animate-pulse-glow" />
          <span className="text-sm text-sortai-silver">Analyzing & classifying...</span>
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
        </div>
        <div className="flex items-center gap-1 mt-3">
          <div className="w-1.5 h-1.5 rounded-full bg-sortai-silver pulse-dot" />
          <div className="w-1.5 h-1.5 rounded-full bg-sortai-silver pulse-dot" />
          <div className="w-1.5 h-1.5 rounded-full bg-sortai-silver pulse-dot" />
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({ linkData }: { linkData: ClassifiedLink }) {
  const spaceColors = SPACE_BADGE_COLORS[linkData.space.toLowerCase()] || SPACE_BADGE_COLORS.other;

  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-md w-full rounded-2xl rounded-tl-md glass overflow-hidden">
        <div className="p-5 space-y-3">
          {/* Space Badge */}
          <div className="flex items-center justify-between">
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider border ${spaceColors.bg} ${spaceColors.text} ${spaceColors.border}`}>
              {linkData.space}
            </span>
            <span className="text-[10px] text-sortai-slate capitalize flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                linkData.confidence === 'high' ? 'bg-emerald-400' :
                linkData.confidence === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              {linkData.confidence} confidence
            </span>
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

          {/* Saved note */}
          <div className="flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70" />
            <span className="text-[11px] text-sortai-slate">
              Saved to <span className="text-sortai-silver font-medium capitalize">{linkData.space}</span>
            </span>
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

function ErrorBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-md px-4 py-3 rounded-2xl rounded-tl-md bg-red-500/10 border border-red-500/20">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{content}</span>
        </div>
      </div>
    </div>
  );
}

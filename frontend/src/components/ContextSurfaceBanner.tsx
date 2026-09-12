import React, { useState, useEffect } from 'react';
import { Sparkles, X, ArrowUpRight } from 'lucide-react';

export interface ContextMatch {
  id: string;
  title: string;
  url: string;
  space: string;
  shortDescription?: string;
  tags?: string[];
}

export interface ContextSurfaceBannerProps {
  getIdToken: () => Promise<string | null>;
  apiUrl: string;
}

const MOCK_FALLBACK_MATCHES: ContextMatch[] = [
  {
    id: 'mock-1',
    title: 'React 19 Server Components Deep Dive',
    url: 'https://react.dev',
    space: 'Tech',
    shortDescription: 'Key architectural updates in React 19 for full-stack applications.',
    tags: ['React', 'Tech'],
  },
  {
    id: 'mock-2',
    title: 'Top Startup Strategies for Y-Combinator',
    url: 'https://ycombinator.com',
    space: 'Career',
    shortDescription: 'Essential guide to pitching and building high-retention products.',
    tags: ['Startup', 'YC'],
  },
  {
    id: 'mock-3',
    title: 'Gemini Vision AI Integration Patterns',
    url: 'https://ai.google.dev',
    space: 'Tools',
    shortDescription: 'How multimodal LLMs analyze webpage screenshots and metadata.',
    tags: ['AI', 'Gemini'],
  },
];

export const ContextSurfaceBanner: React.FC<ContextSurfaceBannerProps> = ({
  getIdToken,
  apiUrl,
}) => {
  const [matches, setMatches] = useState<ContextMatch[]>([]);
  const [topic, setTopic] = useState<string>('Tech & Startup Trends');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchContextSurface();
  }, []);

  const fetchContextSurface = async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        setMatches(MOCK_FALLBACK_MATCHES);
        return;
      }

      const res = await fetch(`${apiUrl}/api/context-surface`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: 'https://news.ycombinator.com',
          title: 'Startup & Tech Intelligence',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.hasMatches && data.highlights.length > 0) {
          setMatches(data.highlights);
          setTopic(data.queryTopic || 'Tech & Startup Trends');
        } else {
          setMatches(MOCK_FALLBACK_MATCHES);
        }
      } else {
        setMatches(MOCK_FALLBACK_MATCHES);
      }
    } catch {
      setMatches(MOCK_FALLBACK_MATCHES);
    }
  };

  if (!isVisible || matches.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto my-4 rounded-2xl bg-sortai-jet/90 border border-sortai-slate/20 p-4 shadow-xl backdrop-blur-md transition-all animate-slide-up relative z-20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-semibold text-sortai-white tracking-wide">
              From Your Saved Links
            </span>
            <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
              Quick Highlights
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-sortai-slate hover:text-sortai-white text-xs p-1 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-sortai-slate mb-3 leading-relaxed">
        💡 You saved <strong>{matches.length} articles</strong> related to{' '}
        <span className="text-sortai-silver font-medium">"{topic}"</span> — here are your quick highlights:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {matches.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between p-3 rounded-xl bg-sortai-black/60 border border-sortai-slate/10 hover:border-emerald-500/30 transition-all hover:translate-y-[-1px]"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] text-emerald-400 font-medium mb-1">
                <span>{item.space}</span>
                <ArrowUpRight className="w-3 h-3 text-sortai-slate group-hover:text-emerald-400 transition-colors" />
              </div>
              <h4 className="text-xs font-semibold text-sortai-white truncate group-hover:text-emerald-300 transition-colors">
                {item.title}
              </h4>
              {item.shortDescription && (
                <p className="text-[11px] text-sortai-slate line-clamp-2 mt-1 font-light leading-relaxed">
                  {item.shortDescription}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

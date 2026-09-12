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

export const ContextSurfaceBanner: React.FC<ContextSurfaceBannerProps> = ({
  getIdToken,
  apiUrl,
}) => {
  const [matches, setMatches] = useState<ContextMatch[]>([]);
  const [topic, setTopic] = useState<string>('Your Saved Highlights');
  const [isVisible, setIsVisible] = useState(true);
  const [hasNoLinks, setHasNoLinks] = useState(false);

  useEffect(() => {
    fetchRealUserLinks();
  }, []);

  const fetchRealUserLinks = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      // Fetch user's real saved links
      const res = await fetch(`${apiUrl}/api/links`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const allLinks = await res.json();
      if (Array.isArray(allLinks) && allLinks.length > 0) {
        // Map top 3 real saved links
        const formatted: ContextMatch[] = allLinks.slice(0, 3).map((l: any) => ({
          id: l.id,
          title: l.title || 'Saved Link',
          url: l.url || '#',
          space: l.space || 'Web links',
          shortDescription: l.shortDescription || 'Saved for later reference.',
          tags: Array.isArray(l.tags) ? l.tags : [],
        }));
        setMatches(formatted);
        const topSpace = formatted[0]?.space || 'Saved';
        setTopic(`${topSpace} & recent saves`);
        setHasNoLinks(false);
      } else {
        setMatches([]);
        setHasNoLinks(true);
      }
    } catch (e) {
      console.warn('[ContextSurfaceBanner] Error fetching real links:', e);
      setHasNoLinks(true);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="w-full max-w-2xl mx-auto my-3 rounded-2xl bg-sortai-jet/90 border border-sortai-slate/20 p-4 shadow-xl backdrop-blur-md transition-all animate-slide-up relative z-20">
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

      {hasNoLinks || matches.length === 0 ? (
        <p className="text-xs text-sortai-slate leading-relaxed">
          💡 <strong>No saved links yet</strong> — paste your first link below and AI will automatically organize it for you!
        </p>
      ) : (
        <>
          <p className="text-xs text-sortai-slate mb-3 leading-relaxed">
            💡 Quick highlights from your saved library in <span className="text-sortai-silver font-medium">"{topic}"</span>:
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
        </>
      )}
    </div>
  );
};

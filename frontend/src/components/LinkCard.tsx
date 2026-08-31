import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  CheckCircle2,
  Puzzle,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const VALID_SPACES = [
  'Career', 'Study', 'Fashion', 'Fitness', 'Tech',
  'Tools', 'Web links', 'Entertainment', 'Life', 'Other',
];

export interface LinkData {
  id: string;
  url: string;
  title: string;
  description: string;
  space: string;
  tags: string[];
  source: string;
  thumbnail?: string;
  confidence: 'high' | 'medium' | 'low';
  createdAt: string;
  reasonToSave?: string;
  savedFrom?: string;
}

interface LinkCardProps {
  link: LinkData;
  onDelete?: (id: string) => void;
  onMoved?: () => void;
}

function getSourceAccentClass(source: string): string {
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
    youtube: '▶ YouTube', github: '⌘ GitHub', instagram: '📷 Instagram',
    tiktok: '♪ TikTok', linkedin: '💼 LinkedIn', facebook: '📘 Facebook',
    web: '🌐 Web', other: '🔗 Link',
  };
  return labels[key] || labels.other;
}

const SPACE_ACCENT: Record<string, string> = {
  career: 'bg-space-career/10 text-space-career border-space-career/25',
  study: 'bg-space-study/10 text-space-study border-space-study/25',
  fashion: 'bg-space-fashion/10 text-space-fashion border-space-fashion/25',
  fitness: 'bg-space-fitness/10 text-space-fitness border-space-fitness/25',
  tech: 'bg-space-tech/10 text-space-tech border-space-tech/25',
  tools: 'bg-space-tools/10 text-space-tools border-space-tools/25',
  'web links': 'bg-space-weblinks/10 text-space-weblinks border-space-weblinks/25',
  entertainment: 'bg-space-entertainment/10 text-space-entertainment border-space-entertainment/25',
  life: 'bg-space-life/10 text-space-life border-space-life/25',
  other: 'bg-space-other/10 text-space-other border-space-other/25',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-emerald-400',
  medium: 'bg-yellow-400',
  low: 'bg-sortai-slate',
};

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

export default function LinkCard({ link, onDelete, onMoved }: LinkCardProps) {
  const { user, getIdToken } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [currentSpace, setCurrentSpace] = useState(link.space);
  const [isMoving, setIsMoving] = useState(false);
  const [moveSuccess, setMoveSuccess] = useState('');

  const sourceClass = getSourceAccentClass(link.source);
  const sourceLabel = getSourceLabel(link.source);
  const spaceAccent = SPACE_ACCENT[currentSpace.toLowerCase()] || SPACE_ACCENT.other;
  const confidenceColor = CONFIDENCE_COLORS[link.confidence] || CONFIDENCE_COLORS.medium;

  const handleMoveSpace = async (newSpace: string) => {
    if (newSpace === currentSpace || !user) return;
    
    if (!window.confirm(`Are you sure you want to move this link to the "${newSpace}" category?`)) {
      return;
    }

    setIsMoving(true);
    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ space: newSpace }),
      });
      if (response.ok) {
        setCurrentSpace(newSpace);
        setMoveSuccess(`Moved to ${newSpace}`);
        onMoved?.();
        setTimeout(() => setMoveSuccess(''), 2500);
      } else {
        const err = await response.json();
        console.error('Failed to move space:', err);
      }
    } catch (e) {
      console.error('Failed to move link:', e);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div
      className="group relative bg-sortai-jet rounded-2xl border border-sortai-slate/10
                 hover:border-sortai-slate/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30
                 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this link?')) {
              onDelete(link.id);
            }
          }}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-sortai-jet/85 border border-sortai-slate/20 text-sortai-slate
                     hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100"
          title="Delete link"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Thumbnail */}
      {link.thumbnail && (
        <div className="relative w-full aspect-video overflow-hidden bg-sortai-black">
          <img
            src={link.thumbnail}
            alt={link.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sortai-jet/80 to-transparent" />
          {/* Source badge on thumbnail */}
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${sourceClass} flex items-center gap-1.5`}>
            {sourceLabel}
            {link.savedFrom === 'extension' && (
              <Puzzle className="w-3 h-3 text-sortai-pale/80" title="Saved via Extension" />
            )}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-2.5">
        {/* Top row: source + space + confidence */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source (only if no thumbnail) */}
          {!link.thumbnail && (
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${sourceClass} flex items-center gap-1.5`}>
              {sourceLabel}
              {link.savedFrom === 'extension' && (
                <Puzzle className="w-3 h-3 text-sortai-pale/80" title="Saved via Extension" />
              )}
            </span>
          )}
          {/* Space badge with invisible select overlay for quick changing */}
          <div className="relative cursor-pointer" title="Click to change category">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${spaceAccent} flex items-center gap-1`}>
              {currentSpace}
              <ChevronDown className="w-2.5 h-2.5 opacity-70" />
            </span>
            <select
              value={currentSpace}
              onChange={(e) => handleMoveSpace(e.target.value)}
              disabled={isMoving}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {VALID_SPACES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {/* Confidence */}
          <div className="flex items-center gap-1 ml-auto">
            <div className={`w-1.5 h-1.5 rounded-full ${confidenceColor}`} />
            <span className="text-[10px] text-sortai-slate capitalize">{link.confidence}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-heading text-sm font-medium text-sortai-white leading-tight line-clamp-2">
          {link.title || 'Untitled Link'}
        </h3>

        {/* Description (truncated) */}
        {link.description && (
          <p className={`text-[13px] text-sortai-pale/80 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {link.description}
          </p>
        )}

        {/* Tags (limited) */}
        {link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {link.tags.slice(0, expanded ? link.tags.length : 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] rounded-md bg-sortai-black border border-sortai-slate/15 text-sortai-slate"
              >
                {tag}
              </span>
            ))}
            {!expanded && link.tags.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] text-sortai-slate">
                +{link.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Expandable details */}
        {expanded && (
          <div className="space-y-2.5 pt-1 animate-fade-in">
            {/* AI reasoning */}
            {link.reasonToSave && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-sortai-black/40 border border-sortai-slate/8">
                <Zap className="w-3 h-3 text-sortai-silver flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-sortai-silver leading-relaxed italic">{link.reasonToSave}</p>
              </div>
            )}

            {/* Move to space */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-sortai-slate uppercase tracking-wider font-semibold">Move to</span>
              <select
                value={currentSpace}
                onChange={(e) => handleMoveSpace(e.target.value)}
                disabled={isMoving}
                className="flex-1 text-[11px] bg-sortai-black border border-sortai-slate/15 rounded-lg px-2.5 py-1.5 text-sortai-silver
                           hover:border-sortai-slate/30 cursor-pointer focus:outline-none disabled:opacity-50"
              >
                {VALID_SPACES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Move success message */}
            {moveSuccess && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {moveSuccess}
              </p>
            )}
          </div>
        )}

        {/* Bottom row: timestamp + expand toggle */}
        <div className="flex items-center justify-between pt-1 mt-auto">
          <div className="flex items-center gap-1 text-[10px] text-sortai-slate">
            <Clock className="w-3 h-3" />
            {timeAgo(link.createdAt)}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-sortai-slate hover:text-sortai-silver transition-colors"
          >
            {expanded ? 'Less' : 'More'}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Open button */}
        <button
          onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                     bg-sortai-white/[0.05] border border-sortai-slate/10
                     text-sortai-silver text-sm font-medium
                     hover:bg-sortai-white/[0.1] hover:text-sortai-white hover:border-sortai-slate/25
                     active:scale-[0.98] transition-all duration-200"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Link
        </button>
      </div>
    </div>
  );
}



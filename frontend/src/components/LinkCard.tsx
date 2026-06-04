import { ExternalLink, Trash2 } from 'lucide-react';

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
}

interface LinkCardProps {
  link: LinkData;
  onDelete?: (id: string) => void;
}

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  youtube: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  instagram: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  twitter: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  x: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  reddit: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  github: { bg: 'bg-sortai-jet', text: 'text-sortai-white', border: 'border-sortai-silver/20' },
  linkedin: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  tiktok: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  medium: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  spotify: { bg: 'bg-sortai-jet', text: 'text-sortai-pale', border: 'border-sortai-slate/20' },
  default: { bg: 'bg-sortai-jet', text: 'text-sortai-silver', border: 'border-sortai-slate/10' },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-sortai-white',
  medium: 'bg-sortai-silver',
  low: 'bg-sortai-slate',
};

function getSourceStyle(source: string) {
  const key = source.toLowerCase().replace(/\.com$/, '');
  return SOURCE_COLORS[key] || SOURCE_COLORS.default;
}

export default function LinkCard({ link, onDelete }: LinkCardProps) {
  const sourceStyle = getSourceStyle(link.source);
  const confidenceColor = CONFIDENCE_COLORS[link.confidence] || CONFIDENCE_COLORS.medium;

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
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sortai-jet/80 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* Top row: source + confidence */}
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${sourceStyle.border} ${sourceStyle.bg} ${sourceStyle.text}`}>
            {link.source || 'Web'}
          </span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${confidenceColor}`} />
            <span className="text-[10px] text-sortai-slate capitalize">{link.confidence}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-heading text-sm font-medium text-sortai-white leading-tight line-clamp-2">
          {link.title || 'Untitled Link'}
        </h3>

        {/* Description */}
        {link.description && (
          <p className="text-[13px] text-sortai-pale/80 leading-relaxed line-clamp-3">
            {link.description}
          </p>
        )}

        {/* Tags */}
        {link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {link.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] rounded-md bg-sortai-black border border-sortai-slate/15 text-sortai-slate"
              >
                {tag}
              </span>
            ))}
            {link.tags.length > 4 && (
              <span className="px-2 py-0.5 text-[10px] text-sortai-slate">
                +{link.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

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

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';
import LinkCard, { type LinkData } from './LinkCard';
import {
  Briefcase,
  BookOpen,
  Shirt,
  Dumbbell,
  Cpu,
  Film,
  Heart,
  Folder,
  Inbox,
  Sparkles,
  Wrench,
  Globe,
  MessageSquare,
  ArrowRight,
  Link as LinkIcon,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface SpaceViewProps {
  space: string;
  refreshTrigger: number;
  onLinkDeleted?: () => void;
  onNavigateToChat?: () => void;
}

const SPACE_ICONS: Record<string, typeof Briefcase> = {
  career: Briefcase,
  study: BookOpen,
  fashion: Shirt,
  fitness: Dumbbell,
  tech: Cpu,
  tools: Wrench,
  'web links': Globe,
  entertainment: Film,
  life: Heart,
  other: Folder,
};

const SPACE_ACCENT_COLORS: Record<string, { gradient: string; iconBg: string; iconText: string }> = {
  career: { gradient: 'from-space-career/10', iconBg: 'bg-space-career/15', iconText: 'text-space-career' },
  study: { gradient: 'from-space-study/10', iconBg: 'bg-space-study/15', iconText: 'text-space-study' },
  fashion: { gradient: 'from-space-fashion/10', iconBg: 'bg-space-fashion/15', iconText: 'text-space-fashion' },
  fitness: { gradient: 'from-space-fitness/10', iconBg: 'bg-space-fitness/15', iconText: 'text-space-fitness' },
  tech: { gradient: 'from-space-tech/10', iconBg: 'bg-space-tech/15', iconText: 'text-space-tech' },
  tools: { gradient: 'from-space-tools/10', iconBg: 'bg-space-tools/15', iconText: 'text-space-tools' },
  'web links': { gradient: 'from-space-weblinks/10', iconBg: 'bg-space-weblinks/15', iconText: 'text-space-weblinks' },
  entertainment: { gradient: 'from-space-entertainment/10', iconBg: 'bg-space-entertainment/15', iconText: 'text-space-entertainment' },
  life: { gradient: 'from-space-life/10', iconBg: 'bg-space-life/15', iconText: 'text-space-life' },
  other: { gradient: 'from-space-other/10', iconBg: 'bg-space-other/15', iconText: 'text-space-other' },
};

export default function SpaceView({ space, refreshTrigger, onLinkDeleted, onNavigateToChat }: SpaceViewProps) {
  const { user, getIdToken } = useAuth();
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  const SpaceIcon = SPACE_ICONS[space] || Folder;
  const accent = SPACE_ACCENT_COLORS[space] || SPACE_ACCENT_COLORS.other;

  const fetchLinks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getIdToken();
      const capitalizedSpace = space.charAt(0).toUpperCase() + space.slice(1);
      const response = await fetch(
        `${API_URL}/api/links?userId=${encodeURIComponent(user.uid)}&space=${encodeURIComponent(capitalizedSpace)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch links');
      const data = await response.json();
      const mapped: LinkData[] = (Array.isArray(data) ? data : []).map((item: Record<string, unknown>) => ({
        id: (item.id as string) || crypto.randomUUID(),
        url: (item.url as string) || '',
        title: (item.title as string) || 'Untitled',
        description: (item.shortDescription as string) || (item.description as string) || '',
        space: (item.space as string) || space,
        tags: (item.tags as string[]) || [],
        source: (item.source as string) || '',
        thumbnail: (item.thumbnailUrl as string) || (item.imageUrl as string) || undefined,
        confidence: ((item.confidence as string) || 'medium') as 'high' | 'medium' | 'low',
        createdAt: (item.createdAt as string) || new Date().toISOString(),
        reasonToSave: (item.reasonToSave as string) || '',
        savedFrom: (item.savedFrom as string) || undefined,
      }));
      setLinks(mapped);
    } catch (error) {
      console.error('Error fetching links:', error);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [user, space, getIdToken]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks, refreshTrigger]);

  useEffect(() => {
    setSearchQuery('');
    setSelectedSource('all');
    setSortBy('newest');
  }, [space]);

  const handleDeleteLink = async (id: string) => {
    if (!user) return;
    try {
      const token = await getIdToken();
      const response = await fetch(
        `${API_URL}/api/links/${id}?userId=${encodeURIComponent(user.uid)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to delete link');
      fetchLinks();
      onLinkDeleted?.();
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const handleLinkMoved = () => {
    fetchLinks();
    onLinkDeleted?.();
  };

  let processedLinks = links.filter((link) => {
    const matchesSearch = searchQuery
      ? (link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         link.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
         link.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      : true;
    const matchesSource = selectedSource === 'all'
      ? true
      : link.source.toLowerCase() === selectedSource.toLowerCase();
    return matchesSearch && matchesSource;
  });

  processedLinks = [...processedLinks].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div className={`relative px-6 pt-6 pb-5 bg-gradient-to-b ${accent.gradient} to-transparent`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl ${accent.iconBg} border border-sortai-slate/10 flex items-center justify-center`}>
            <SpaceIcon className={`w-5 h-5 ${accent.iconText}`} />
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold text-sortai-white capitalize">
              {space}
            </h1>
            <p className="text-[12px] text-sortai-slate">
              {loading ? 'Loading...' : `${links.length} link${links.length !== 1 ? 's' : ''} organized here`}
            </p>
          </div>
        </div>

        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Source Tabs and Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex flex-wrap items-center gap-1 bg-sortai-jet/50 p-1 rounded-xl border border-sortai-slate/10">
            {['all', 'youtube', 'instagram', 'tiktok', 'facebook', 'web'].map((src) => (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className={`px-3 py-1 text-[11px] rounded-lg font-medium capitalize transition-colors
                  ${selectedSource === src
                    ? 'bg-sortai-white/[0.08] text-sortai-white border border-sortai-slate/20 font-semibold'
                    : 'text-sortai-slate hover:text-sortai-silver border border-transparent'
                  }`}
              >
                {src}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-sortai-slate uppercase tracking-wider font-semibold">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-sortai-jet border border-sortai-slate/15 rounded-xl px-3 py-1.5 text-xs text-sortai-silver focus:outline-none focus:border-sortai-slate/30 cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <SkeletonGrid />
        ) : processedLinks.length === 0 ? (
          <EmptyState space={space} hasSearch={!!searchQuery || selectedSource !== 'all'} onNavigateToChat={onNavigateToChat} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {processedLinks.map((link) => (
              <LinkCard key={link.id} link={link} onDelete={handleDeleteLink} onMoved={handleLinkMoved} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-sortai-jet rounded-2xl border border-sortai-slate/10 p-4 space-y-3">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
          <div className="flex gap-2 pt-1">
            <div className="skeleton h-5 w-14 rounded-md" />
            <div className="skeleton h-5 w-12 rounded-md" />
            <div className="skeleton h-5 w-16 rounded-md" />
          </div>
          <div className="skeleton h-9 w-full rounded-xl mt-2" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ space, hasSearch, onNavigateToChat }: { space: string; hasSearch: boolean; onNavigateToChat?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-sortai-jet border border-sortai-slate/10 flex items-center justify-center mb-5">
        {hasSearch ? (
          <Inbox className="w-7 h-7 text-sortai-slate" />
        ) : (
          <LinkIcon className="w-7 h-7 text-sortai-slate" />
        )}
      </div>
      <h3 className="font-heading text-lg font-medium text-sortai-white mb-2">
        {hasSearch ? 'No matches found' : `No links in ${space} yet`}
      </h3>
      <p className="text-sm text-sortai-slate max-w-sm leading-relaxed mb-6">
        {hasSearch
          ? 'Try adjusting your search query or clearing the filters.'
          : `Your saved links will appear here once SortAi analyzes and organizes them into ${space}. Start by pasting a link in the assistant.`}
      </p>
      {!hasSearch && onNavigateToChat && (
        <button
          onClick={onNavigateToChat}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sortai-white/[0.07] border border-sortai-slate/15
                     text-sm text-sortai-silver hover:text-sortai-white hover:bg-sortai-white/[0.12] hover:border-sortai-slate/30
                     transition-all duration-200 active:scale-95"
        >
          <MessageSquare className="w-4 h-4" />
          Go to Link Assistant
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

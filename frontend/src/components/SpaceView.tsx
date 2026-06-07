import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiFetch } from '../lib/api';
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
} from 'lucide-react';

interface SpaceViewProps {
  space: string;
  refreshTrigger: number;
  onLinkDeleted?: () => void;
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

const SPACE_ACCENT: Record<string, string> = {
  career: 'from-sortai-white/[0.04]',
  study: 'from-sortai-white/[0.04]',
  fashion: 'from-sortai-white/[0.04]',
  fitness: 'from-sortai-white/[0.04]',
  tech: 'from-sortai-white/[0.04]',
  tools: 'from-sortai-white/[0.04]',
  'web links': 'from-sortai-white/[0.04]',
  entertainment: 'from-sortai-white/[0.04]',
  life: 'from-sortai-white/[0.04]',
  other: 'from-sortai-white/[0.04]',
};

function mapLinks(data: unknown[], fallbackSpace: string): LinkData[] {
  return (Array.isArray(data) ? data : []).map((value) => {
    const item = value as Record<string, unknown>;
    return ({
    id: (item.id as string) || crypto.randomUUID(),
    url: (item.url as string) || '',
    title: (item.title as string) || 'Untitled',
    description: (item.shortDescription as string) || (item.description as string) || '',
    space: (item.space as string) || fallbackSpace,
    tags: (item.tags as string[]) || [],
    source: (item.source as string) || '',
    thumbnail: (item.thumbnailUrl as string) || (item.imageUrl as string) || undefined,
    confidence: ((item.confidence as string) || 'medium') as 'high' | 'medium' | 'low',
    createdAt: (item.createdAt as string) || new Date().toISOString(),
    });
  });
}

function normalizeSpaceName(space: string): string {
  return space
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function SpaceView({ space, refreshTrigger, onLinkDeleted }: SpaceViewProps) {
  const { user, getIdToken, logout } = useAuth();
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const SpaceIcon = SPACE_ICONS[space] || Folder;
  const accentGradient = SPACE_ACCENT[space] || SPACE_ACCENT.other;

  const fetchLinks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const spaceLabel = normalizeSpaceName(space);
      const data = await apiFetch<{ items: unknown[]; nextCursor: string | null }>(
        `/api/links?space=${encodeURIComponent(spaceLabel)}&pageSize=20`,
        { tokenProvider: getIdToken }
      );
      setLinks(mapLinks(data.items, space));
      setNextCursor(data.nextCursor);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
      }
      console.error('Error fetching links:', error);
      setLinks([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [user, space, getIdToken]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || !user || loadingMore) return;
    setLoadingMore(true);
    try {
      const spaceLabel = normalizeSpaceName(space);
      const data = await apiFetch<{ items: unknown[]; nextCursor: string | null }>(
        `/api/links?space=${encodeURIComponent(spaceLabel)}&pageSize=20&cursor=${encodeURIComponent(nextCursor)}`,
        { tokenProvider: getIdToken }
      );
      setLinks((prev) => [...prev, ...mapLinks(data.items, space)]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
      }
      console.error('Error loading more links:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, user, loadingMore, space, getIdToken]);

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
      await apiFetch(`/api/links/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        tokenProvider: getIdToken,
      });
      fetchLinks();
      if (onLinkDeleted) {
        onLinkDeleted();
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
      }
      console.error('Error deleting link:', error);
    }
  };

  let processedLinks = links.filter((link) => {
    const matchesSearch = searchQuery
      ? (link.title.toLowerCase().includes(searchQuery.toLowerCase())
         || link.description.toLowerCase().includes(searchQuery.toLowerCase())
         || link.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      : true;

    const matchesSource = selectedSource === 'all'
      ? true
      : link.source.toLowerCase() === selectedSource.toLowerCase();

    return matchesSearch && matchesSource;
  });

  processedLinks = [...processedLinks].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  return (
    <div className="h-full flex flex-col">
      <div className={`relative px-6 pt-6 pb-5 bg-gradient-to-b ${accentGradient} to-transparent`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-sortai-jet border border-sortai-slate/15 flex items-center justify-center">
            <SpaceIcon className="w-5 h-5 text-sortai-silver" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold text-sortai-white capitalize">
              {space}
            </h1>
            <p className="text-[12px] text-sortai-slate">
              {loading ? '...' : `${links.length} link${links.length !== 1 ? 's' : ''} saved`}
            </p>
          </div>
        </div>

        <SearchBar value={searchQuery} onChange={setSearchQuery} />

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
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
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
          <EmptyState space={space} hasSearch={!!searchQuery || selectedSource !== 'all'} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {processedLinks.map((link) => (
                <LinkCard key={link.id} link={link} onDelete={handleDeleteLink} />
              ))}
            </div>
            {nextCursor && !searchQuery && selectedSource === 'all' && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded-lg border border-sortai-slate/20 text-sm text-sortai-silver hover:text-sortai-white disabled:opacity-60"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
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

function EmptyState({ space, hasSearch }: { space: string; hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-sortai-jet border border-sortai-slate/10 flex items-center justify-center mb-5">
        {hasSearch ? (
          <Inbox className="w-7 h-7 text-sortai-slate" />
        ) : (
          <Sparkles className="w-7 h-7 text-sortai-slate" />
        )}
      </div>
      <h3 className="font-heading text-lg font-medium text-sortai-white mb-2">
        {hasSearch ? 'No matches found' : `No links in ${space} yet`}
      </h3>
      <p className="text-sm text-sortai-slate max-w-xs leading-relaxed">
        {hasSearch
          ? 'Try adjusting your search query or check for typos.'
          : `Start by pasting a link in the chat — SortAi will classify and save it here automatically.`}
      </p>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LinkCard, { type LinkData } from './LinkCard';
import { Search, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface SemanticSpaceViewProps {
  query: string;
  onLinkDeleted?: () => void;
  onNavigateToChat?: () => void;
}

export default function SemanticSpaceView({ query, onLinkDeleted, onNavigateToChat }: SemanticSpaceViewProps) {
  const { user, getIdToken } = useAuth();
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || !user) return;
    
    let isMounted = true;
    
    const performSearch = async () => {
      setLoading(true);
      setLinks([]);
      try {
        const token = await getIdToken();
        const response = await fetch(
          `${API_URL}/api/links/search?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        
        if (isMounted) {
          const mapped: LinkData[] = (Array.isArray(data) ? data : []).map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            url: item.url || '',
            title: item.title || 'Untitled',
            description: `Semantic Match Score: ${(item.score * 100).toFixed(1)}%`,
            space: item.space || 'Other',
            tags: [],
            source: 'web', // fallback
            confidence: 'high',
            createdAt: item.createdAt || new Date().toISOString(),
            reasonToSave: '',
          }));
          setLinks(mapped);
        }
      } catch (error) {
        console.error('Semantic search error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    performSearch();
    
    return () => {
      isMounted = false;
    };
  }, [query, user, getIdToken]);

  return (
    <div className="h-full flex flex-col">
      <div className="relative px-6 pt-6 pb-5 bg-gradient-to-b from-sortai-pale/10 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-sortai-pale/15 border border-sortai-slate/10 flex items-center justify-center">
            <Search className="w-5 h-5 text-sortai-pale" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold text-sortai-white">
              Semantic Search
            </h1>
            <p className="text-[12px] text-sortai-slate">
              {loading ? 'Searching your AI vault...' : `Found ${links.length} results for "${query}"`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 text-sortai-slate animate-spin" />
          </div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in">
            <Search className="w-10 h-10 text-sortai-slate/50 mb-4" />
            <h3 className="text-sortai-white text-lg font-medium">No strong matches found</h3>
            <p className="text-sortai-slate text-sm mt-2">Try rewording your search or saving more links.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {links.map((link) => (
              <LinkCard key={link.id} link={link} onDelete={onLinkDeleted} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

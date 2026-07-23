import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Briefcase,
  BookOpen,
  Shirt,
  Dumbbell,
  Cpu,
  Film,
  Heart,
  Folder,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings,
  Wrench,
  Globe,
  Download,
  Search,
  MessageSquare,
  LayoutDashboard,
  User,
  Zap,
} from 'lucide-react';

export type SpaceSummary = {
  [key: string]: number;
};

interface SidebarProps {
  spaceSummary: SpaceSummary;
  activeView: string;
  onSelectView: (view: string) => void;
  user: { displayName: string | null; email: string | null; photoURL: string | null };
  onOpenSettings: () => void;
  isInstallable?: boolean;
  onInstallClick?: () => void;
  onSmartSearch?: (query: string) => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onOpenFeedback?: () => void;
  onUpgradeClick?: () => void;
  userTier?: string;
}

const SPACE_CONFIG: { name: string; icon: typeof Briefcase; dotClass: string }[] = [
  { name: 'Career', icon: Briefcase, dotClass: 'space-dot-career' },
  { name: 'Study', icon: BookOpen, dotClass: 'space-dot-study' },
  { name: 'Fashion', icon: Shirt, dotClass: 'space-dot-fashion' },
  { name: 'Fitness', icon: Dumbbell, dotClass: 'space-dot-fitness' },
  { name: 'Tech', icon: Cpu, dotClass: 'space-dot-tech' },
  { name: 'Tools', icon: Wrench, dotClass: 'space-dot-tools' },
  { name: 'Web links', icon: Globe, dotClass: 'space-dot-weblinks' },
  { name: 'Entertainment', icon: Film, dotClass: 'space-dot-entertainment' },
  { name: 'Life', icon: Heart, dotClass: 'space-dot-life' },
  { name: 'Other', icon: Folder, dotClass: 'space-dot-other' },
];

export default function Sidebar({ 
  spaceSummary, 
  activeView, 
  onSelectView, 
  user, 
  onOpenSettings, 
  isInstallable, 
  onInstallClick, 
  onSmartSearch,
  isAdmin,
  onOpenAdmin,
  onOpenFeedback,
  onUpgradeClick,
  userTier
}: SidebarProps) {
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const totalLinks = Object.values(spaceSummary).reduce((sum, n) => sum + n, 0);

  const handleSelect = (view: string) => {
    onSelectView(view);
    setMobileOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSmartSearch) {
      onSmartSearch(searchQuery.trim());
      setMobileOpen(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/SortAi-Logo.png"
            alt="SortAi"
            className="h-7 w-auto"
            style={{ filter: 'invert(1)' }}
          />
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sortai-white/10 text-sortai-silver border border-sortai-slate/20 tracking-wider uppercase leading-none">BETA</span>
          
          {userTier !== 'pro' && (
            <button
              onClick={onUpgradeClick}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gradient-to-r from-emerald-400/20 to-blue-500/20 text-emerald-400 border border-emerald-400/30 tracking-wider uppercase leading-none hover:bg-emerald-400/30 transition-all cursor-pointer ml-1"
            >
              <Zap className="w-3 h-3" /> PRO
            </button>
          )}
        </div>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-lg text-sortai-slate hover:text-sortai-pale hover:bg-sortai-jet transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Chat Nav ── */}
      <div className="px-3 mb-1">
        <button
          onClick={() => handleSelect('chat')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
            ${activeView === 'chat'
              ? 'bg-sortai-white/[0.07] text-sortai-white border border-sortai-slate/20'
              : 'text-sortai-silver hover:bg-sortai-white/[0.04] hover:text-sortai-pale border border-transparent'
            }`}
        >
          <Sparkles className="w-[18px] h-[18px]" />
          <span>Link Assistant</span>
          {totalLinks > 0 && (
            <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-sortai-jet border border-sortai-slate/20 text-sortai-slate">
              {totalLinks}
            </span>
          )}
        </button>
      </div>

      {/* ── Divider ── */}
      <div className="mx-5 my-3 h-px bg-sortai-slate/15" />

      {/* ── Spaces Header ── */}
      <div className="px-5 mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-sortai-slate">
          Spaces
        </span>
        <span className="text-[10px] text-sortai-slate/60">{SPACE_CONFIG.length}</span>
      </div>
      
      {/* ── Smart Search ── */}
      <div className="px-3 mb-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sortai-slate" />
          <input
            type="text"
            placeholder="AI Semantic Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-sortai-white/[0.03] border border-sortai-slate/15 rounded-xl py-2 pl-9 pr-3 text-xs text-sortai-silver placeholder:text-sortai-slate/70 focus:outline-none focus:border-sortai-slate/40 transition-colors"
          />
        </form>
      </div>

      {/* ── Spaces List ── */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {SPACE_CONFIG.map(({ name, icon: Icon, dotClass }) => {
          const count = spaceSummary[name.toLowerCase()] ?? 0;
          const isActive = activeView === name.toLowerCase();

          return (
            <button
              key={name}
              onClick={() => handleSelect(name.toLowerCase())}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 group
                ${isActive
                  ? 'bg-sortai-white/[0.07] text-sortai-white border border-sortai-slate/20'
                  : 'text-sortai-silver hover:bg-sortai-white/[0.04] hover:text-sortai-pale border border-transparent'
                }`}
            >
              <div className="relative">
                <Icon className="w-[16px] h-[16px] flex-shrink-0" />
                <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${dotClass} ${isActive ? 'opacity-100' : 'opacity-50'}`} />
              </div>
              <span className="flex-1 text-left">{name}</span>
              {count > 0 && (
                <span
                  className={`text-[11px] min-w-[24px] text-center px-1.5 py-0.5 rounded-full transition-colors
                    ${isActive
                      ? 'bg-sortai-white/10 text-sortai-silver'
                      : 'bg-sortai-jet text-sortai-slate group-hover:text-sortai-silver'
                    }`}
                >
                  {count}
                </span>
              )}
              <ChevronRight
                className={`w-3.5 h-3.5 flex-shrink-0 transition-all duration-200
                  ${isActive ? 'opacity-60 text-sortai-silver' : 'opacity-0 group-hover:opacity-40 text-sortai-slate'}`}
              />
            </button>
          );
        })}
      </div>

      {/* ── User Section ── */}
      <div className="mt-auto border-t border-sortai-slate/15 p-4">
        {isInstallable && (
          <button
            onClick={onInstallClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sortai-white text-sortai-black font-medium hover:bg-sortai-silver transition-colors mb-4"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Install App</span>
          </button>
        )}
      </div>

      {/* Admin & Feedback Actions */}
      <div className="px-4 pt-2 border-t border-sortai-slate/10 space-y-2 pb-4">
        <button
          onClick={onOpenFeedback}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sortai-slate hover:bg-sortai-white/[0.05] hover:text-sortai-white transition-all text-sm font-medium"
        >
          <MessageSquare className="w-5 h-5 flex-shrink-0" />
          <span className="truncate">Send Feedback</span>
        </button>
        
        {isAdmin && (
          <button
            onClick={onOpenAdmin}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
              activeView === 'admin' 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                : 'text-blue-400/70 hover:bg-blue-500/10 hover:text-blue-400 border border-transparent'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Admin Dashboard</span>
          </button>
        )}

        {/* User Profile */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sortai-black/50 border border-sortai-slate/10 group mt-2">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-sortai-slate/10 flex-shrink-0 relative">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-sortai-slate absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-sortai-white truncate">
                {user.displayName || 'User'}
              </p>
              {userTier === 'pro' && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(52,211,153,0.3)] bg-gradient-to-r from-emerald-400 to-blue-500 text-black uppercase leading-none tracking-wider whitespace-nowrap">
                  PRO
                </span>
              )}
            </div>
            <p className="text-xs text-sortai-slate truncate">
              {user.email || 'No email'}
            </p>
          </div>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-sortai-slate hover:text-sortai-white hover:bg-sortai-white/5 transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-sortai-slate hover:text-red-400 hover:bg-red-400/10 transition-all"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile hamburger ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl glass text-sortai-silver hover:text-sortai-white transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar (mobile: slide-in; desktop: static) ── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[280px] bg-sortai-jet border-r border-sortai-slate/10
          transform transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

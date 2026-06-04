import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
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
} from 'lucide-react';

export interface SpaceSummary {
  [space: string]: number;
}

interface SidebarProps {
  spaceSummary: SpaceSummary;
  activeView: string;
  onSelectView: (view: string) => void;
  user: { displayName: string | null; email: string | null; photoURL: string | null };
  onOpenSettings: () => void;
}

const SPACE_CONFIG: { name: string; icon: typeof Briefcase }[] = [
  { name: 'Career', icon: Briefcase },
  { name: 'Study', icon: BookOpen },
  { name: 'Fashion', icon: Shirt },
  { name: 'Fitness', icon: Dumbbell },
  { name: 'Tech', icon: Cpu },
  { name: 'Tools', icon: Wrench },
  { name: 'Web links', icon: Globe },
  { name: 'Entertainment', icon: Film },
  { name: 'Life', icon: Heart },
  { name: 'Other', icon: Folder },
];

export default function Sidebar({ spaceSummary, activeView, onSelectView, user, onOpenSettings }: SidebarProps) {
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalLinks = Object.values(spaceSummary).reduce((sum, n) => sum + n, 0);

  const handleSelect = (view: string) => {
    onSelectView(view);
    setMobileOpen(false);
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
          <MessageSquare className="w-[18px] h-[18px]" />
          <span>Chat</span>
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

      {/* ── Spaces List ── */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {SPACE_CONFIG.map(({ name, icon: Icon }) => {
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
              <Icon className="w-[16px] h-[16px] flex-shrink-0" />
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
        <div className="flex items-center gap-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="Avatar"
              className="w-8 h-8 rounded-full ring-2 ring-sortai-slate/20"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-sortai-jet border border-sortai-slate/20 flex items-center justify-center">
              <span className="text-xs font-medium text-sortai-silver">
                {(user.displayName?.[0] || user.email?.[0] || '?').toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sortai-pale truncate">
              {user.displayName || 'User'}
            </p>
            <p className="text-[11px] text-sortai-slate truncate">
              {user.email || ''}
            </p>
          </div>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-sortai-slate hover:text-sortai-pale hover:bg-sortai-white/[0.05] transition-all duration-200"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-sortai-slate hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
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

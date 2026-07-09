import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Zap, Shield, Globe } from 'lucide-react';

const SPACE_CHIPS = [
  'Career', 'Study', 'Fashion', 'Fitness', 'Tech', 'Tools', 'Web links', 'Entertainment', 'Life', 'Other',
];

const FEATURES = [
  { icon: Zap, label: 'AI Classification', desc: 'Auto-categorize any link' },
  { icon: Shield, label: 'Smart Storage', desc: 'Organized link spaces' },
  { icon: Globe, label: 'Rich Previews', desc: 'Titles, tags & metadata' },
];

export default function Login() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await login();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-sortai-black">
      {/* ── Animated Background ── */}
      <div className="absolute inset-0 gradient-mesh" />

      {/* Floating hexagons */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${10 + i * 15}%`,
            top: `${15 + (i % 3) * 25}%`,
            animationDelay: `${i * 1.2}s`,
          }}
        >
          <svg
            className="opacity-[0.08]"
            width={40 + i * 12}
            height={40 + i * 12}
            viewBox="0 0 100 100"
            style={{
              animation: `hexFloat ${5 + i}s ease-in-out ${i * 0.8}s infinite`,
            }}
          >
            <polygon
              points="50,2 93,25 93,75 50,98 7,75 7,25"
              fill="none"
              stroke="#6A6A6A"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      ))}

      {/* Radial glow */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, rgba(181,181,181,0.3), transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* ── Main Card ── */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="glass-heavy rounded-2xl p-8 md:p-10 shadow-2xl shadow-black/50">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/SortAi-Logo.png"
              alt="SortAi"
              className="h-12 md:h-14 w-auto"
              style={{ filter: 'invert(1)' }}
            />
          </div>

          {/* Tagline */}
          <h1 className="font-heading text-xl md:text-2xl font-semibold text-sortai-white text-center mb-2">
            Your AI-Powered
            <br />
            <span className="inline-flex items-center gap-2">
              Link Intelligence Hub
              <Sparkles className="w-5 h-5 text-sortai-silver animate-pulse-glow" />
            </span>
          </h1>

          <p className="text-sortai-silver text-sm text-center mb-8 leading-relaxed max-w-xs mx-auto">
            Paste any link and SortAi will automatically classify, tag, and organize it into smart spaces — powered by AI.
          </p>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex flex-col items-center text-center p-3 rounded-xl bg-sortai-black/50 border border-sortai-slate/10"
              >
                <div className="w-9 h-9 rounded-lg bg-sortai-jet flex items-center justify-center mb-2 border border-sortai-slate/20">
                  <Icon className="w-4 h-4 text-sortai-silver" />
                </div>
                <span className="text-[11px] font-medium text-sortai-pale leading-tight">{label}</span>
                <span className="text-[10px] text-sortai-slate mt-0.5">{desc}</span>
              </div>
            ))}
          </div>

          {/* Space Chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {SPACE_CHIPS.map((chip) => (
              <span
                key={chip}
                className="px-3 py-1 text-[11px] font-medium rounded-full bg-sortai-jet border border-sortai-slate/20 text-sortai-silver
                           hover:border-sortai-slate/40 transition-colors cursor-default"
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl
                       bg-sortai-white text-sortai-black font-medium text-sm
                       hover:bg-white hover:shadow-lg hover:shadow-white/10
                       active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-sortai-black/30 border-t-sortai-black rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          {/* Footer */}
          <p className="text-sortai-slate text-[11px] text-center mt-6">
            By signing in, you agree to let SortAi organize your links.
          </p>
        </div>

        {/* Subtle branding below card */}
        <p className="text-center text-sortai-slate/50 text-[11px] mt-6 font-heading tracking-wider uppercase">
          SortAi v1.0
        </p>
      </div>
    </div>
  );
}

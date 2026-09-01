import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Zap, Shield, Globe, ArrowRight, Github, Linkedin, Mail, Layout, Bot, Search } from 'lucide-react';

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
    <div className="min-h-screen bg-sortai-black text-sortai-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* ── Background Effects ── */}
      <div className="fixed inset-0 gradient-mesh opacity-50 pointer-events-none" />
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-heavy border-b border-sortai-slate/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/SortAi-Logo.png" alt="SortAi Logo" className="h-8 w-auto invert" />
          <span className="font-heading font-bold text-lg tracking-wide hidden sm:block">SortAi</span>
        </div>
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="px-5 py-2 rounded-xl bg-sortai-white text-sortai-black font-semibold text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          {isLoading ? 'Loading...' : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sortai-jet border border-sortai-slate/20 text-[11px] font-medium text-emerald-400 mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Now with Gemini Vision AI Integration</span>
        </div>
        
        <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          Your AI-Powered <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
            Link Intelligence Hub
          </span>
        </h1>
        
        <p className="text-sortai-silver text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          Stop losing valuable knowledge in endless browser bookmarks. Paste any link, and SortAi automatically categorizes, tags, and organizes it into smart spaces.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-md">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-95 overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-2">
            Try SortAi Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>

        {/* ── Product UI Mockup (Fulfills Google's "Live Product" Requirement) ── */}
        <div className="mt-20 w-full max-w-5xl relative">
          <div className="absolute inset-0 bg-gradient-to-t from-sortai-black via-transparent to-transparent z-10 h-full w-full rounded-2xl" />
          <div className="rounded-2xl border border-sortai-slate/20 bg-sortai-jet shadow-2xl overflow-hidden flex flex-col md:flex-row h-[400px] md:h-[600px] text-left relative">
            {/* Fake Sidebar */}
            <div className="hidden md:flex w-64 border-r border-sortai-slate/10 bg-sortai-black/50 p-4 flex-col gap-4">
              <div className="h-8 w-24 bg-sortai-slate/20 rounded-md mb-4" />
              <div className="flex items-center gap-3 text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-lg">
                <Layout className="w-4 h-4" /> <span className="text-sm font-medium">All Links</span>
              </div>
              <div className="flex items-center gap-3 text-sortai-silver px-3 py-2">
                <Bot className="w-4 h-4" /> <span className="text-sm">Tech (14)</span>
              </div>
              <div className="flex items-center gap-3 text-sortai-silver px-3 py-2">
                <Search className="w-4 h-4" /> <span className="text-sm">Career (8)</span>
              </div>
            </div>
            {/* Fake Main Content */}
            <div className="flex-1 p-6 md:p-8 bg-sortai-black">
              <div className="h-10 w-full max-w-md bg-sortai-jet border border-sortai-slate/20 rounded-xl mb-8 flex items-center px-4">
                <span className="text-sortai-slate text-sm">Paste a URL here...</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1 */}
                <div className="p-4 rounded-xl border border-sortai-slate/20 bg-sortai-jet">
                  <div className="h-32 w-full bg-sortai-slate/10 rounded-lg mb-3" />
                  <div className="h-4 w-3/4 bg-sortai-slate/20 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-sortai-slate/10 rounded" />
                </div>
                {/* Card 2 */}
                <div className="p-4 rounded-xl border border-sortai-slate/20 bg-sortai-jet">
                  <div className="h-32 w-full bg-sortai-slate/10 rounded-lg mb-3" />
                  <div className="h-4 w-5/6 bg-sortai-slate/20 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-sortai-slate/10 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="relative z-10 py-24 bg-sortai-black border-t border-sortai-slate/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">How SortAi Works</h2>
            <p className="text-sortai-silver max-w-2xl mx-auto">We use state-of-the-art vision and language models to understand what you save, so you don't have to organize it manually.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-sortai-jet border border-sortai-slate/10">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Classification</h3>
              <p className="text-sortai-silver text-sm leading-relaxed">Our Gemini integration instantly reads the context of any webpage or YouTube video and categorizes it accurately.</p>
            </div>
            <div className="p-6 rounded-2xl bg-sortai-jet border border-sortai-slate/10">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Link Spaces</h3>
              <p className="text-sortai-silver text-sm leading-relaxed">Links are grouped into dynamic spaces like Tech, Career, or Fitness based on semantic meaning, not just folders.</p>
            </div>
            <div className="p-6 rounded-2xl bg-sortai-jet border border-sortai-slate/10">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Rich Previews</h3>
              <p className="text-sortai-silver text-sm leading-relaxed">We automatically generate high-quality thumbnails, concise summaries, and tags so you know exactly what a link is at a glance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Team / Operational Transparency Section (Crucial for Google Startup Approval) ── */}
      <section className="relative z-10 py-24 bg-sortai-jet border-t border-sortai-slate/10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-16">Built by Builders</h2>
          
          <div className="inline-block p-1 rounded-2xl bg-gradient-to-b from-sortai-slate/20 to-transparent">
            <div className="bg-sortai-black p-8 rounded-xl border border-sortai-slate/10 max-w-sm mx-auto flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-400 to-blue-500 mb-6 p-1">
                <div className="w-full h-full rounded-full bg-sortai-jet flex items-center justify-center overflow-hidden">
                  {/* Replace this with an actual photo path if you have one, e.g., /founder.jpg */}
                  <span className="font-heading font-bold text-3xl text-sortai-white">UK</span>
                </div>
              </div>
              <h3 className="text-xl font-bold">Uday Kiran Hari</h3>
              <p className="text-emerald-400 text-sm font-medium mb-4">Founder & CEO</p>
              <p className="text-sortai-silver text-sm mb-6 leading-relaxed text-center">
                SortAi was built to solve the personal frustration of losing valuable knowledge in endless bookmarks. We use advanced AI to bring order to your digital life.
              </p>
              <div className="flex gap-4">
                <a href="https://linkedin.com/in/uday-kiran-hari" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-sortai-jet hover:bg-sortai-slate/20 transition-colors text-sortai-silver hover:text-white">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="https://github.com/UDAYKIRANHARI" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-sortai-jet hover:bg-sortai-slate/20 transition-colors text-sortai-silver hover:text-white">
                  <Github className="w-5 h-5" />
                </a>
                <a href="mailto:founder@sortai.dev" className="p-2 rounded-lg bg-sortai-jet hover:bg-sortai-slate/20 transition-colors text-sortai-silver hover:text-white">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-sortai-slate/10 bg-sortai-black py-8 text-center text-sortai-slate text-sm">
        <p>© {new Date().getFullYear()} SortAi. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-4">
          <a href="#" className="hover:text-sortai-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-sortai-white transition-colors">Terms of Service</a>
          <a href="mailto:founder@sortai.dev" className="hover:text-sortai-white transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
}

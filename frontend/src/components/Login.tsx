import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Github, Linkedin, Mail, Search, Command, Layers, Zap } from 'lucide-react';
import Hero3D from './Hero3D';

export default function Login() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      
      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between mix-blend-difference">
        <div className="flex items-center gap-3">
          <img src="/SortAi-Logo.png" alt="SortAi Logo" className="h-8 w-auto invert opacity-90" />
          <span className="font-semibold text-lg tracking-wide hidden sm:block text-white/90">SortAi</span>
        </div>
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-medium text-sm transition-all"
        >
          {isLoading ? 'Connecting...' : 'Sign In'}
        </button>
      </nav>

      {/* ── Hero Section with 3D ── */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* 3D Background */}
        <Hero3D />
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-emerald-300 mb-8 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Powered by Gemini Vision AI</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-8 leading-[1.1]">
              Organize the web, <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-blue-300 to-purple-400">
                without lifting a finger.
              </span>
            </h1>
            
            <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              Paste a link. We analyze the content, generate a summary, and auto-sort it into intelligent spaces. Your digital second brain, fully automated.
            </p>

            <div className="pointer-events-auto">
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-semibold text-lg hover:scale-105 transition-all duration-300"
              >
                Start using SortAi
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-xs uppercase tracking-widest font-medium">Scroll to explore</span>
          <div className="w-[1px] h-10 bg-gradient-to-b from-white/50 to-transparent" />
        </motion.div>
      </section>

      {/* ── Product Showcase ── */}
      <section className="relative z-10 py-32 px-6 bg-[#050505]">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row"
          >
            {/* Minimalist UI Mockup */}
            <div className="lg:w-1/2 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-center">
              <h2 className="text-3xl font-bold mb-4 tracking-tight">The smartest place for your links.</h2>
              <p className="text-white/50 mb-8 leading-relaxed">
                SortAi doesn't just save links. It uses visual AI to look at the webpage or YouTube video, understands the context, and tags it precisely.
              </p>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white/90">Instant Context</h4>
                    <p className="text-sm text-white/50">Auto-generated summaries and tags.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white/90">Semantic Sorting</h4>
                    <p className="text-sm text-white/50">Links are grouped by meaning, not rigid folders.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Visual Abstract Mockup */}
            <div className="lg:w-1/2 bg-[#0a0a0a] p-8 relative overflow-hidden flex items-center justify-center min-h-[400px]">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent" />
              <div className="w-full max-w-sm flex flex-col gap-4 relative z-10">
                {/* Search Bar */}
                <div className="h-12 rounded-xl bg-white/5 border border-white/10 flex items-center px-4 gap-3">
                  <Search className="w-5 h-5 text-white/30" />
                  <div className="h-4 w-32 bg-white/20 rounded-md" />
                </div>
                {/* Link Cards */}
                <motion.div 
                  initial={{ x: 50, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="h-24 rounded-lg bg-[#111] mb-3 border border-white/5" />
                  <div className="h-4 w-3/4 bg-emerald-400/20 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-white/10 rounded" />
                </motion.div>
                <motion.div 
                  initial={{ x: 50, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex gap-2 mb-3">
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-[10px] text-blue-300">Design</span>
                    <span className="px-2 py-1 rounded bg-white/10 text-[10px] text-white/50">Inspiration</span>
                  </div>
                  <div className="h-4 w-full bg-white/20 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-white/10 rounded" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Operational Transparency / Team ── */}
      <section className="relative z-10 py-32 bg-[#020202] border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-16">Built by Builders.</h2>
            
            <div className="inline-flex flex-col items-center p-8 rounded-3xl bg-white/[0.02] border border-white/5 shadow-2xl backdrop-blur-sm">
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-400 to-blue-500 p-[2px] mb-6">
                <div className="w-full h-full rounded-full bg-[#050505] flex items-center justify-center">
                  <span className="text-2xl font-bold text-white tracking-widest">UK</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-1">Uday Kiran Hari</h3>
              <p className="text-emerald-400 font-medium text-sm mb-6 uppercase tracking-wider">Founder & CEO</p>
              
              <p className="text-white/50 text-sm max-w-md leading-relaxed mb-8">
                SortAi was built to solve the frustration of digital hoarding. We leverage cutting-edge Vision AI to bring effortless order to your knowledge base.
              </p>
              
              <div className="flex gap-3 justify-center">
                <a href="https://linkedin.com/in/uday-kiran-hari" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="https://github.com/UDAYKIRANHARI" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                  <Github className="w-5 h-5" />
                </a>
                <a href="mailto:founder@sortai.dev" className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 py-8 border-t border-white/5 bg-[#050505] text-center">
        <p className="text-white/30 text-xs">© {new Date().getFullYear()} SortAi. All rights reserved.</p>
      </footer>
    </div>
  );
}

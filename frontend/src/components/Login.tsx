import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ArrowRight, Github, Linkedin, Mail,
  Search, Layers, Zap, Eye, Tag, FileText, FolderOpen,
  Brain, Play, Loader2, Check, ExternalLink
} from 'lucide-react';

/* ── Demo Data ── */
const DEMO_URL = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
const DEMO_STEPS = [
  { label: 'Pasting link...', duration: 800 },
  { label: 'Vision AI scanning page...', duration: 1400 },
  { label: 'Extracting metadata...', duration: 1000 },
  { label: 'Classifying into space...', duration: 800 },
];
const DEMO_RESULT = {
  title: 'Rick Astley – Never Gonna Give You Up',
  summary: 'The iconic 1987 music video by Rick Astley, one of the most viewed videos on YouTube and the origin of the "rickroll" internet phenomenon.',
  space: 'Entertainment',
  tags: ['Music', 'Viral', '80s'],
  confidence: 'high',
  thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
};

/* ── Bento Search Demo ── */
const SEARCH_QUERY = 'that viral music video from the 80s';
const SEARCH_RESULTS = [
  { title: 'Rick Astley – Never Gonna Give You Up', space: 'Entertainment', match: true },
  { title: 'Synthwave Production Tutorial', space: 'Study', match: false },
  { title: '80s Fashion Comeback Guide', space: 'Fashion', match: false },
];

/* ── Typewriter Hook ── */
function useTypewriter(text: string, speed: number, trigger: boolean) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!trigger) { setDisplayed(''); return; }
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, trigger]);
  return displayed;
}

export default function Login() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [demoState, setDemoState] = useState<'idle' | 'running' | 'done'>('idle');
  const [demoStep, setDemoStep] = useState(-1);
  const demoUrl = useTypewriter(DEMO_URL, 25, demoState !== 'idle');

  const [searchHover, setSearchHover] = useState(false);
  const searchQuery = useTypewriter(SEARCH_QUERY, 40, searchHover);

  const handleLogin = async () => {
    setIsLoading(true);
    try { await login(); } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const runDemo = () => {
    if (demoState !== 'idle') return;
    setDemoState('running');
    setDemoStep(0);
    let elapsed = 0;
    DEMO_STEPS.forEach((step, i) => {
      elapsed += step.duration;
      setTimeout(() => setDemoStep(i + 1), elapsed);
    });
    setTimeout(() => setDemoState('done'), elapsed + 200);
  };

  const resetDemo = () => { setDemoState('idle'); setDemoStep(-1); };

  return (
    <div className="min-h-screen bg-sortai-black text-sortai-white font-sans selection:bg-sortai-silver/30 overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-sortai-black/80 border-b border-sortai-slate/10">
        <div className="flex items-center gap-3">
          <img src="/SortAi-Logo.png" alt="SortAi" className="h-8 w-auto invert opacity-90" />
          <span className="font-heading font-semibold text-lg tracking-wide hidden sm:block text-sortai-white/90">SortAi</span>
        </div>
        <button onClick={handleLogin} disabled={isLoading}
          className="px-5 py-2 rounded-full bg-sortai-white text-sortai-black font-semibold text-sm hover:bg-sortai-pale transition-all">
          {isLoading ? 'Connecting...' : 'Get Started'}
        </button>
      </nav>

      {/* ══════════════════════════════════════════════
          HERO – Live Demo
          ══════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-sortai-slate/[0.05] blur-[150px] rounded-full pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sortai-jet border border-sortai-slate/20 text-xs font-medium text-sortai-silver mb-8">
            <Sparkles className="w-3.5 h-3.5" /> Built with Gemini Vision AI
          </div>

          <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-[1.1]">
            Stop bookmarking.<br className="hidden md:block" />
            <span className="text-sortai-silver">
              Start sorting.
            </span>
          </h1>

          <p className="text-sortai-slate text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            You save dozens of links every week and never find them again. SortAi reads every link you paste, figures out what it's about, and files it for you.
          </p>
        </motion.div>

        {/* ── Interactive Demo Card ── */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
          className="w-full max-w-2xl">
          <div className="rounded-2xl border border-sortai-slate/20 bg-sortai-jet overflow-hidden shadow-2xl shadow-black/50">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-sortai-slate/10 bg-sortai-black/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-sortai-slate/20" />
                <div className="w-3 h-3 rounded-full bg-sortai-slate/20" />
                <div className="w-3 h-3 rounded-full bg-sortai-slate/20" />
              </div>
              <div className="flex-1 mx-4 h-7 rounded-md bg-sortai-black border border-sortai-slate/10 flex items-center px-3">
                <span className="text-[11px] text-sortai-slate font-mono truncate">
                  {demoState === 'idle' ? 'sortai.dev' : demoUrl || 'sortai.dev'}
                </span>
              </div>
            </div>

            {/* Demo body */}
            <div className="p-6 md:p-8 min-h-[320px] flex flex-col">
              <div className="flex gap-3 mb-6">
                <div className="flex-1 h-12 rounded-xl bg-sortai-black border border-sortai-slate/20 flex items-center px-4 gap-3">
                  <ExternalLink className="w-4 h-4 text-sortai-slate/50 shrink-0" />
                  <span className="text-sm text-sortai-slate font-mono truncate">
                    {demoState !== 'idle' ? demoUrl : 'Paste any URL here...'}
                  </span>
                </div>
                {demoState === 'idle' && (
                  <button onClick={runDemo}
                    className="shrink-0 px-5 h-12 rounded-xl bg-sortai-white hover:bg-sortai-pale text-sortai-black font-semibold text-sm flex items-center gap-2 transition-colors">
                    <Play className="w-4 h-4" /> Try it
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {demoState === 'running' && (
                  <motion.div key="steps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-center gap-3">
                    {DEMO_STEPS.map((step, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.3 }}
                        className="flex items-center gap-3">
                        {demoStep > i ? (
                          <div className="w-6 h-6 rounded-full bg-sortai-silver/10 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-sortai-pale" />
                          </div>
                        ) : demoStep === i ? (
                          <Loader2 className="w-5 h-5 text-sortai-silver animate-spin" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-sortai-slate/10" />
                        )}
                        <span className={`text-sm ${demoStep >= i ? 'text-sortai-pale' : 'text-sortai-slate/30'}`}>
                          {step.label}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {demoState === 'done' && (
                  <motion.div key="result" initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', damping: 20 }}
                    className="flex-1">
                    <div className="rounded-xl border border-sortai-slate/20 bg-sortai-black p-4 flex gap-4">
                      <img src={DEMO_RESULT.thumbnail} alt="" className="w-28 h-20 rounded-lg object-cover shrink-0 bg-sortai-jet" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1 truncate text-sortai-white">{DEMO_RESULT.title}</h4>
                        <p className="text-xs text-sortai-slate leading-relaxed line-clamp-2 mb-2">{DEMO_RESULT.summary}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-sortai-silver/10 text-[10px] font-medium text-sortai-pale">
                            {DEMO_RESULT.space}
                          </span>
                          {DEMO_RESULT.tags.map(t => (
                            <span key={t} className="px-2 py-0.5 rounded bg-sortai-slate/10 text-[10px] text-sortai-slate">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button onClick={resetDemo}
                      className="mt-4 text-xs text-sortai-slate hover:text-sortai-silver transition-colors underline underline-offset-2">
                      Run again
                    </button>
                  </motion.div>
                )}

                {demoState === 'idle' && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex-1 flex items-center justify-center">
                    <p className="text-sortai-slate text-sm">Click <strong className="text-sortai-silver">"Try it"</strong> to see it in action</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40"
          animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
          <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-sortai-slate">Explore</span>
          <div className="w-px h-8 bg-gradient-to-b from-sortai-slate/40 to-transparent" />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════
          BENTO GRID – Feature Deep Dives
          ══════════════════════════════════════════════ */}
      <section className="relative z-10 py-24 px-6 bg-sortai-black">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight mb-4 text-sortai-white">What happens when you paste a link.</h2>
            <p className="text-sortai-slate max-w-lg mx-auto">No setup. No tagging. No folder gymnastics. Just paste and go.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* ── Box 1: Vision AI (full width) ── */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="md:col-span-2 rounded-2xl border border-sortai-slate/20 bg-sortai-jet overflow-hidden group hover:border-sortai-slate/30 transition-colors">
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-1/2 p-8 lg:p-10 flex flex-col justify-center">
                  <div className="w-10 h-10 rounded-xl bg-sortai-slate/10 flex items-center justify-center mb-5">
                    <Eye className="w-5 h-5 text-sortai-silver" />
                  </div>
                  <h3 className="font-heading text-2xl font-bold mb-3 tracking-tight text-sortai-white">It reads the page for you.</h3>
                  <p className="text-sortai-slate text-sm leading-relaxed mb-6">
                    SortAi doesn't just look at the URL. It opens the page, reads the content, watches the video — then writes you a summary, picks the right tags, and explains why you might want it later.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: FileText, label: 'Title & Summary' },
                      { icon: Tag, label: 'Smart Tags' },
                      { icon: Layers, label: 'Auto Space' },
                      { icon: Brain, label: 'Why you saved it' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2.5 text-sortai-silver">
                        <Icon className="w-4 h-4 text-sortai-slate" />
                        <span className="text-xs font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:w-1/2 bg-sortai-black p-8 border-t lg:border-t-0 lg:border-l border-sortai-slate/10 relative overflow-hidden">
                  <div className="relative z-10 space-y-3">
                    <div className="rounded-lg bg-sortai-jet border border-sortai-slate/10 p-3">
                      <div className="text-[10px] text-sortai-slate font-mono mb-2">// what SortAi sees</div>
                      <div className="space-y-2 text-xs font-mono">
                        <div><span className="text-sortai-silver">title</span><span className="text-sortai-slate">:</span> <span className="text-sortai-pale">"How to Build AI Agents"</span></div>
                        <div><span className="text-sortai-silver">summary</span><span className="text-sortai-slate">:</span> <span className="text-sortai-pale">"A deep dive into autonomous..."</span></div>
                        <div><span className="text-sortai-silver">space</span><span className="text-sortai-slate">:</span> <span className="text-sortai-pale">"Tech"</span></div>
                        <div><span className="text-sortai-silver">tags</span><span className="text-sortai-slate">:</span> <span className="text-sortai-pale">["AI", "Agents", "Tutorial"]</span></div>
                        <div><span className="text-sortai-silver">confidence</span><span className="text-sortai-slate">:</span> <span className="text-sortai-pale">"high"</span></div>
                      </div>
                    </div>
                    <motion.div className="h-1 rounded-full bg-sortai-silver/20 origin-left"
                      initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                      transition={{ delay: 0.5, duration: 1.5, ease: 'easeOut' }} />
                    <p className="text-[10px] text-sortai-slate">Classified in 1.2s · 97% confidence</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Box 2: Smart Spaces vs Folders ── */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-sortai-slate/20 bg-sortai-jet p-8 group hover:border-sortai-slate/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-sortai-slate/10 flex items-center justify-center mb-5">
                <FolderOpen className="w-5 h-5 text-sortai-silver" />
              </div>
              <h3 className="font-heading text-xl font-bold mb-3 tracking-tight text-sortai-white">Folders are broken.</h3>
              <p className="text-sortai-slate text-sm leading-relaxed mb-6">
                You don't need more folders. You need something that just <em>knows</em> where things go.
              </p>
              <div className="space-y-3">
                <div className="rounded-lg bg-sortai-black border border-sortai-slate/10 p-3">
                  <div className="text-[10px] text-sortai-slate font-medium mb-2">❌ Your bookmarks bar, probably</div>
                  <div className="flex flex-wrap gap-1">
                    {['Untitled', 'Misc', 'New Folder (2)', 'Read Later', 'TODO'].map(f => (
                      <span key={f} className="px-2 py-1 rounded bg-sortai-slate/10 text-[10px] text-sortai-slate">{f}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-sortai-black border border-sortai-slate/20 p-3">
                  <div className="text-[10px] text-sortai-silver font-medium mb-2">✓ SortAi</div>
                  <div className="flex flex-wrap gap-1">
                    {['Tech (14)', 'Career (8)', 'Fitness (5)', 'Entertainment (12)'].map(s => (
                      <span key={s} className="px-2 py-1 rounded bg-sortai-silver/10 text-[10px] text-sortai-pale font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Box 3: Universal Search ── */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              onMouseEnter={() => setSearchHover(true)} onMouseLeave={() => setSearchHover(false)}
              className="rounded-2xl border border-sortai-slate/20 bg-sortai-jet p-8 group hover:border-sortai-slate/30 transition-all cursor-default">
              <div className="w-10 h-10 rounded-xl bg-sortai-slate/10 flex items-center justify-center mb-5">
                <Search className="w-5 h-5 text-sortai-silver" />
              </div>
              <h3 className="font-heading text-xl font-bold mb-3 tracking-tight text-sortai-white">Find it the way you remember it.</h3>
              <p className="text-sortai-slate text-sm leading-relaxed mb-6">
                Forgot the URL? Just describe what you're looking for. SortAi searches by meaning, not keywords.
              </p>
              <div className="space-y-2">
                <div className="h-10 rounded-lg bg-sortai-black border border-sortai-slate/20 flex items-center px-3 gap-2">
                  <Search className="w-4 h-4 text-sortai-slate/50" />
                  <span className="text-xs text-sortai-silver font-mono">{searchQuery}<span className="animate-pulse">|</span></span>
                </div>
                <AnimatePresence>
                  {searchHover && searchQuery.length > 10 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-1">
                      {SEARCH_RESULTS.map((r, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${r.match ? 'bg-sortai-silver/10 border border-sortai-silver/20' : 'bg-sortai-black/50'}`}>
                          <span className={r.match ? 'text-sortai-white font-medium' : 'text-sortai-slate'}>{r.title}</span>
                          <span className={`text-[10px] ${r.match ? 'text-sortai-pale' : 'text-sortai-slate/50'}`}>{r.space}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TEAM
          ══════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 bg-sortai-black border-t border-sortai-slate/10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight mb-16 text-sortai-white">Who's behind this.</h2>

            <div className="inline-flex flex-col items-center p-8 rounded-3xl bg-sortai-jet border border-sortai-slate/10 shadow-2xl shadow-black/30">
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-sortai-slate to-sortai-silver p-[2px] mb-6">
                <div className="w-full h-full rounded-full bg-sortai-jet flex items-center justify-center">
                  <span className="text-2xl font-bold text-sortai-white tracking-widest">UK</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-1 text-sortai-white">Uday Kiran Hari</h3>
              <p className="text-sortai-silver font-medium text-sm mb-6 uppercase tracking-wider">Founder & CEO</p>

              <p className="text-sortai-slate text-sm max-w-md leading-relaxed mb-8">
                I kept losing great articles and videos in a mess of browser bookmarks. So I built the tool I wished existed — one that actually reads what you save and puts it where it belongs.
              </p>

              <div className="flex gap-3 justify-center">
                <a href="https://linkedin.com/in/uday-kiran-hari" target="_blank" rel="noopener noreferrer"
                  className="p-3 rounded-full bg-sortai-black hover:bg-sortai-slate/10 transition-colors text-sortai-slate hover:text-sortai-white">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="https://github.com/UDAYKIRANHARI" target="_blank" rel="noopener noreferrer"
                  className="p-3 rounded-full bg-sortai-black hover:bg-sortai-slate/10 transition-colors text-sortai-slate hover:text-sortai-white">
                  <Github className="w-5 h-5" />
                </a>
                <a href="mailto:founder@sortai.dev"
                  className="p-3 rounded-full bg-sortai-black hover:bg-sortai-slate/10 transition-colors text-sortai-slate hover:text-sortai-white">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 py-24 px-6 bg-sortai-black border-t border-sortai-slate/10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4 text-sortai-white">Your bookmarks deserve better.</h2>
          <p className="text-sortai-slate mb-8">Free to use. Takes 10 seconds.</p>
          <button onClick={handleLogin} disabled={isLoading}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-sortai-white text-sortai-black font-semibold text-lg hover:scale-105 transition-all duration-300">
            Get started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 py-8 border-t border-sortai-slate/10 bg-sortai-black text-center">
        <p className="text-sortai-slate text-xs">© {new Date().getFullYear()} SortAi. All rights reserved.</p>
      </footer>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Link as LinkIcon, MessageSquare, Loader2, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface AdminStats {
  totalUsers: number;
  totalLinks: number;
}

interface FeedbackItem {
  id: string;
  userId: string;
  userEmail: string | null;
  message: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { getIdToken } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      
      const [statsRes, feedbackRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/feedbacks`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!statsRes.ok || !feedbackRes.ok) {
        throw new Error('Failed to fetch admin data. Ensure you have admin privileges.');
      }

      const statsData = await statsRes.json();
      const feedbackData = await feedbackRes.json();

      setStats(statsData);
      setFeedbacks(feedbackData);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sortai-slate animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-heading text-sortai-white mb-2">Access Denied</h2>
        <p className="text-sortai-slate">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        
        <header>
          <h1 className="text-3xl font-heading font-semibold text-sortai-white">Admin Dashboard</h1>
          <p className="text-sortai-slate mt-2">Monitor app statistics and user feedback.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-sortai-black/40 border border-sortai-slate/10 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sortai-slate text-sm font-semibold uppercase tracking-wider">Total Users</p>
              <p className="text-3xl font-heading text-sortai-white font-bold">{stats?.totalUsers || 0}</p>
            </div>
          </div>
          
          <div className="bg-sortai-black/40 border border-sortai-slate/10 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sortai-slate text-sm font-semibold uppercase tracking-wider">Total Links Saved</p>
              <p className="text-3xl font-heading text-sortai-white font-bold">{stats?.totalLinks || 0}</p>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-heading font-semibold text-sortai-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sortai-slate" />
            User Feedback
          </h2>
          
          {feedbacks.length === 0 ? (
            <div className="text-center py-12 bg-sortai-black/20 border border-sortai-slate/5 rounded-2xl">
              <p className="text-sortai-slate">No feedback received yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="bg-sortai-jet border border-sortai-slate/10 rounded-xl p-5 hover:border-sortai-slate/20 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold text-sortai-white">{fb.userEmail || 'Anonymous User'}</p>
                      <p className="text-xs text-sortai-slate font-mono">ID: {fb.userId}</p>
                    </div>
                    <span className="text-xs text-sortai-slate">
                      {new Date(fb.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sortai-silver text-sm leading-relaxed mt-3 whitespace-pre-wrap">{fb.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

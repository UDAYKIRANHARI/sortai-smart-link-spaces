import React, { useState } from 'react';
import { X, Zap, Crown, Check, Infinity, Sparkles, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface PricingModalProps {
  onClose: () => void;
  triggerReason: 'MONTHLY_LINK_LIMIT' | 'VISION_AI_LIMIT' | 'manual';
  currentUsage?: { monthlyLinkCount: number; visionAiCount: number };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function PricingModal({ onClose, triggerReason, currentUsage }: PricingModalProps) {
  const { user, getIdToken } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const getHeaderContent = () => {
    switch (triggerReason) {
      case 'MONTHLY_LINK_LIMIT':
        return {
          title: "You've reached your monthly limit",
          subtitle: 'Free users can save up to 30 links per month',
          icon: <Shield className="w-8 h-8 text-sortai-slate mb-4" />
        };
      case 'VISION_AI_LIMIT':
        return {
          title: 'Vision AI scans used up',
          subtitle: 'Free users get 3 AI video analysis scans',
          icon: <Sparkles className="w-8 h-8 text-purple-400 mb-4" />
        };
      default:
        return {
          title: 'Upgrade to Pro',
          subtitle: 'Unlock the full power of SortAI',
          icon: <Crown className="w-8 h-8 text-yellow-400 mb-4" />
        };
    }
  };

  const headerContent = getHeaderContent();

  const handleUpgrade = async (planId: string) => {
    try {
      setIsLoading(planId);
      const token = await getIdToken();
      const res = await fetch(`${API_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user?.uid, email: user?.email, planId })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(`Server Error: ${data.error || 'Failed to create checkout session'}`);
        return;
      }
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error: Stripe did not return a checkout URL');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(`Network Error: ${error instanceof Error ? error.message : 'Could not reach backend'}`);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <style>
        {`
          @keyframes borderGlow {
            0%, 100% { border-color: rgba(52, 211, 153, 0.4); box-shadow: 0 0 20px rgba(52, 211, 153, 0.1); }
            50% { border-color: rgba(99, 102, 241, 0.4); box-shadow: 0 0 20px rgba(99, 102, 241, 0.1); }
          }
          .pro-card-glow {
            animation: borderGlow 4s infinite ease-in-out;
          }
        `}
      </style>

      <div className="relative w-full max-w-2xl glass-heavy rounded-2xl overflow-hidden border border-sortai-slate/20 flex flex-col my-auto max-h-[90vh]">
        {/* Gradient Top Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-500 shrink-0" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-sortai-slate hover:text-sortai-white hover:bg-sortai-slate/10 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            {headerContent.icon}
            <h2 className="font-heading text-2xl font-bold text-sortai-white mb-2">
              {headerContent.title}
            </h2>
            <p className="text-sortai-slate">
              {headerContent.subtitle}
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Free Tier */}
            <div className="relative p-6 rounded-xl border border-sortai-slate/20 bg-sortai-jet/50 flex flex-col">
              <div className="absolute top-4 right-4">
                <span className="text-xs font-semibold px-2.5 py-1 bg-sortai-slate/20 text-sortai-silver rounded-full">
                  Current Plan
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold text-sortai-white mb-1">Free</h3>
              <div className="text-2xl font-bold text-sortai-white mb-6">$0<span className="text-sm font-normal text-sortai-slate">/mo</span></div>
              
              <ul className="space-y-4 flex-1">
                <li className="flex items-start text-sm text-sortai-silver">
                  <Check className="w-4 h-4 mr-3 text-sortai-slate shrink-0 mt-0.5" />
                  <span>30 links/month</span>
                </li>
                <li className="flex items-start text-sm text-sortai-silver">
                  <Check className="w-4 h-4 mr-3 text-sortai-slate shrink-0 mt-0.5" />
                  <span>3 Vision AI scans (total)</span>
                </li>
                <li className="flex items-start text-sm text-sortai-silver">
                  <Check className="w-4 h-4 mr-3 text-sortai-slate shrink-0 mt-0.5" />
                  <span>Basic text AI tagging</span>
                </li>
              </ul>
            </div>

            {/* Pro Tier */}
            <div className="relative p-6 rounded-xl border-2 pro-card-glow bg-gradient-to-b from-sortai-jet to-black flex flex-col transform md:-translate-y-2">
              <div className="absolute -top-3 inset-x-0 flex justify-center">
                <span className="text-xs font-bold px-3 py-1 bg-gradient-to-r from-emerald-400 to-blue-500 text-black rounded-full flex items-center">
                  <Zap className="w-3 h-3 mr-1" />
                  MOST POPULAR
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold text-sortai-white mb-1 mt-2">Pro</h3>
              <div className="mb-6">
                <div className="text-3xl font-bold text-sortai-white">$9<span className="text-sm font-normal text-sortai-slate">/mo</span></div>
                <div className="text-xs text-emerald-400 mt-1">$79/yr (save 27%)</div>
              </div>
              
              <ul className="space-y-4 flex-1 mb-8">
                <li className="flex items-start text-sm text-sortai-white">
                  <Infinity className="w-4 h-4 mr-3 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Unlimited links</span>
                </li>
                <li className="flex items-start text-sm text-sortai-white">
                  <Infinity className="w-4 h-4 mr-3 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Unlimited Vision AI scans</span>
                </li>
                <li className="flex items-start text-sm text-sortai-white">
                  <Check className="w-4 h-4 mr-3 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Semantic AI Search</span>
                </li>
                <li className="flex items-start text-sm text-sortai-white">
                  <Check className="w-4 h-4 mr-3 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Priority processing</span>
                </li>
              </ul>

              <button 
                onClick={() => handleUpgrade('monthly')}
                disabled={isLoading !== null}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-emerald-400 to-blue-500 text-black font-semibold flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading === 'monthly' ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </>
                )}
              </button>
              <button 
                onClick={() => handleUpgrade('yearly')}
                disabled={isLoading !== null}
                className="w-full mt-2 py-2 px-4 rounded-lg border border-emerald-400/30 text-emerald-400 text-sm font-medium flex items-center justify-center hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
              >
                {isLoading === 'yearly' ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  'Save 27% — $79/year'
                )}
              </button>
            </div>
          </div>

          {/* Founder's Pass Banner */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 p-4 mb-6 hover:border-purple-500/60 transition-colors group cursor-pointer" onClick={() => handleUpgrade('lifetime')}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Crown className="w-16 h-16 text-purple-400" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-heading text-base font-bold text-sortai-white flex items-center mb-1">
                  Founder's Lifetime Pass
                  <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    First 100 Users
                  </span>
                </h4>
                <p className="text-sm text-sortai-silver">One-time payment of $149. Yours forever.</p>
              </div>
              <button 
                disabled={isLoading !== null}
                className="text-sm font-semibold text-purple-300 hover:text-purple-200 flex items-center shrink-0 whitespace-nowrap"
              >
                {isLoading === 'lifetime' ? 'Processing...' : 'Get Lifetime Access →'}
              </button>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="text-sm text-sortai-slate hover:text-sortai-silver transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

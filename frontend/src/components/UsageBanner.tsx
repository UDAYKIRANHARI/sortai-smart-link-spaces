import React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export interface UsageBannerProps {
  tier: 'free' | 'pro';
  monthlyLinkCount: number;
  visionAiCount: number;
  onUpgradeClick: () => void;
}

export const UsageBanner: React.FC<UsageBannerProps> = ({
  tier,
  monthlyLinkCount,
  visionAiCount,
  onUpgradeClick,
}) => {
  if (tier === 'pro') {
    return (
      <div className="flex items-center h-10 px-4 w-full">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          ✦ Pro
        </span>
      </div>
    );
  }

  const linksMax = 30;
  const visionMax = 3;

  const getProgressColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 1) return 'bg-red-400';
    if (ratio >= 0.8) return 'bg-amber-400';
    return 'bg-emerald-400';
  };

  const getProgressWidth = (current: number, max: number) => {
    return `${Math.min((current / max) * 100, 100)}%`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between min-h-10 px-4 py-2 sm:py-0 bg-transparent text-xs text-sortai-slate gap-2 sm:gap-6 w-full font-medium">
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full sm:w-auto">
        {/* Links Progress */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="whitespace-nowrap w-20 sm:w-auto">Links: {monthlyLinkCount}/{linksMax}</span>
          <div className="h-1.5 w-24 bg-sortai-slate/20 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500 ease-in-out", getProgressColor(monthlyLinkCount, linksMax))}
              style={{ width: getProgressWidth(monthlyLinkCount, linksMax) }}
            />
          </div>
        </div>

        {/* Vision AI Progress */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="whitespace-nowrap w-20 sm:w-auto">Vision AI: {visionAiCount}/{visionMax}</span>
          <div className="h-1.5 w-16 bg-sortai-slate/20 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500 ease-in-out", getProgressColor(visionAiCount, visionMax))}
              style={{ width: getProgressWidth(visionAiCount, visionMax) }}
            />
          </div>
        </div>
      </div>

      <button 
        onClick={onUpgradeClick}
        className="flex items-center gap-1 sm:gap-1.5 text-sortai-silver hover:text-emerald-400 transition-colors font-medium whitespace-nowrap ml-auto sm:ml-0 mt-2 sm:mt-0"
      >
        <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
        Upgrade
      </button>
    </div>
  );
};

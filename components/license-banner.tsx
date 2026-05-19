'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X, Gauge, ArrowRight } from 'lucide-react';

/**
 * License enforcement banner — shows credit usage warnings.
 * In production, this would check the backend subscription API.
 * For now, it uses demo data that matches the billing page.
 */
export function LicenseBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Demo: Growth plan, 3247/5000 credits used = 65%
  const creditsUsed = 3247;
  const creditsTotal = 5000;
  const percent = Math.round((creditsUsed / creditsTotal) * 100);
  const remaining = creditsTotal - creditsUsed;

  // Only show if >= 70%
  if (dismissed || percent < 70) return null;

  const isCritical = percent >= 90;

  return (
    <div className={`mx-4 sm:mx-6 lg:mx-10 mt-4 rounded-xl border p-3 flex items-center gap-3 ${
      isCritical
        ? 'bg-red-500/10 border-red-500/20'
        : 'bg-amber-500/10 border-amber-500/20'
    }`}>
      <AlertTriangle size={16} className={isCritical ? 'text-red-400' : 'text-amber-400'} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
            {isCritical ? 'Credits almost exhausted' : 'Credits running low'}
          </span>
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500">{remaining.toLocaleString()} left</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          {percent}% of monthly Quality Operations credits used. Rule & pattern healings remain free.
        </p>
      </div>
      <Link
        href="/billing"
        className={`shrink-0 text-xs font-semibold flex items-center gap-1 ${
          isCritical ? 'text-red-400' : 'text-amber-400'
        }`}
      >
        Upgrade <ArrowRight size={12} />
      </Link>
      <button onClick={() => setDismissed(true)} className="text-slate-500 hover:text-white transition-colors shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

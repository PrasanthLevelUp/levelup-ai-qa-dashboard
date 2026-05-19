'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

/* Scene durations in ms — total ~50s */
const DURATIONS = [
  4000,  // 0 — Hook
  5500,  // 1 — Failing test
  4000,  // 2 — AI Detects
  6500,  // 3 — Before/After
  5500,  // 4 — 3-Tier Engine
  5000,  // 5 — Stats
  7000,  // 6 — CTA
];

const TOTAL = DURATIONS.length;

export default function HealingReel() {
  const [s, setS] = useState(-1);
  const [paused, setPaused] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const next = useCallback(() => setS(p => p < TOTAL - 1 ? p + 1 : p), []);

  useEffect(() => {
    if (s === -1) { const t = setTimeout(() => setS(0), 600); return () => clearTimeout(t); }
    if (paused || s >= TOTAL - 1) return;
    timer.current = setTimeout(next, DURATIONS[s]);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [s, paused, next]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setPaused(p => !p); }
      if (e.key === 'ArrowRight') setS(p => Math.min(p + 1, TOTAL - 1));
      if (e.key === 'ArrowLeft') setS(p => Math.max(p - 1, 0));
      if (e.key === 'r') { setS(-1); setPaused(false); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const progress = s >= 0 ? ((s + 1) / TOTAL) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-[#020408] flex items-center justify-center" onClick={() => setPaused(p => !p)}>
      {/* 9:16 vertical frame */}
      <div className="relative bg-[#060c18] overflow-hidden shadow-2xl" style={{ width: '390px', height: '693px', borderRadius: '12px' }}>
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-emerald-500/[0.04] blur-[80px]" />
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        {/* Watermark logo top-right */}
        <div className="absolute top-3 right-3 z-50 flex items-center gap-1.5 opacity-60">
          <div className="relative w-5 h-5"><Image src="/logo-192.png" alt="" fill className="object-contain" /></div>
          <span className="text-[9px] text-white/50 font-semibold tracking-wide">LevelUp AI QA</span>
        </div>

        {/* Scene container */}
        <div className="relative w-full h-full flex items-center justify-center p-6">
          {s === -1 && <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />}
          {s === 0 && <S0_Hook />}
          {s === 1 && <S1_FailingTest />}
          {s === 2 && <S2_AIDetects />}
          {s === 3 && <S3_BeforeAfter />}
          {s === 4 && <S4_ThreeTier />}
          {s === 5 && <S5_Stats />}
          {s === 6 && <S6_CTA />}
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-1.5 z-50">
          {DURATIONS.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${
              i < s ? 'w-4 bg-emerald-400/60' : i === s ? 'w-6 bg-emerald-400' : 'w-2 bg-white/10'
            }`} />
          ))}
        </div>

        {/* Top progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5 z-50">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>

        {paused && s >= 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-40">
            <div className="text-white/70 text-xs tracking-widest uppercase">Paused</div>
          </div>
        )}
      </div>

      {/* Instructions outside frame */}
      <div className="absolute bottom-4 text-white/20 text-[10px] tracking-wider uppercase">
        Space = pause · Arrows = navigate · R = restart
      </div>
    </div>
  );
}

/* ============================================= */
/* SCENES                                        */
/* ============================================= */

/* Scene 0 — Hook (3.5s) */
function S0_Hook() {
  return (
    <div className="text-center space-y-6 reel-fadein">
      <div className="relative w-20 h-20 mx-auto logo-pulse">
        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-[30px]" />
        <Image src="/logo_full.png" alt="LevelUp" fill className="object-contain relative z-10" priority />
      </div>
      <div className="space-y-3">
        <p className="text-sm text-red-400 font-bold tracking-wider uppercase slide-up" style={{ animationDelay: '0.3s' }}>Your tests break every sprint</p>
        <h1 className="text-3xl font-extrabold text-white leading-tight text-slam" style={{ animationDelay: '0.6s' }}>
          What if they<br />could <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">fix themselves?</span>
        </h1>
      </div>
      <div className="slide-up" style={{ animationDelay: '1.2s' }}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-emerald-400 text-xs font-bold">LevelUp AI QA</span>
          <span className="text-[10px] text-slate-500">· Self-Healing Tests</span>
        </div>
      </div>
    </div>
  );
}

/* Scene 1 — Failing Test (5s) */
function S1_FailingTest() {
  return (
    <div className="w-full space-y-4 reel-fadein">
      <p className="text-xs text-red-400/60 tracking-[0.2em] uppercase text-center slide-up">The Problem</p>
      <div className="bg-[#0d1117] rounded-lg border border-red-500/20 overflow-hidden slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#161b22] border-b border-white/5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="ml-2 text-[9px] text-slate-600 font-mono">CI Pipeline</span>
        </div>
        <div className="p-3 font-mono text-[10px] space-y-1.5 stagger-children">
          <p className="text-slate-500">$ npx playwright test</p>
          <p className="text-slate-500">Running 247 tests...</p>
          <p className="text-green-400">✓ 198 passed</p>
          <p className="text-red-400 font-bold shake" style={{ animationDelay: '1.5s' }}>✗ 12 failed</p>
          <p className="text-yellow-400">⚠ 37 flaky</p>
          <div className="mt-2 pt-2 border-t border-white/5 error-flash" style={{ animationDelay: '2s' }}>
            <p className="text-red-500 font-bold">Error: Target not found</p>
            <p className="text-red-400/60 text-[9px]">[data-testid=&quot;submit-btn&quot;]</p>
          </div>
        </div>
      </div>
      <p className="text-center text-red-400 text-xs font-semibold slide-up" style={{ animationDelay: '2.5s' }}>
        🚫 Release v2.4.1 BLOCKED
      </p>
    </div>
  );
}

/* Scene 2 — AI Detects (3.5s) */
function S2_AIDetects() {
  return (
    <div className="w-full text-center space-y-6 reel-fadein">
      <div className="relative w-16 h-16 mx-auto">
        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-[25px] animate-pulse" />
        <Image src="/logo_full.png" alt="" fill className="object-contain relative z-10" />
      </div>
      <div className="space-y-3">
        <p className="text-sm text-emerald-400 font-bold tracking-wider uppercase slide-up" style={{ animationDelay: '0.2s' }}>LevelUp AI QA Activates</p>
        <h2 className="text-2xl font-extrabold text-white text-slam" style={{ animationDelay: '0.5s' }}>
          Broken locator<br />detected
        </h2>
      </div>
      <div className="space-y-2 slide-up" style={{ animationDelay: '1s' }}>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-mono">Analyzing DOM snapshot...</span>
        </div>
        <div className="flex items-center justify-center gap-2 slide-up" style={{ animationDelay: '1.5s' }}>
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-mono">3 candidate elements found</span>
        </div>
        <div className="flex items-center justify-center gap-2 slide-up" style={{ animationDelay: '2s' }}>
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-400 font-mono font-bold">Match found — 96% confidence</span>
        </div>
      </div>
    </div>
  );
}

/* Scene 3 — Before / After (6s) */
function S3_BeforeAfter() {
  return (
    <div className="w-full space-y-3 reel-fadein">
      <p className="text-xs text-emerald-400/60 tracking-[0.2em] uppercase text-center slide-up">Live Healing</p>

      {/* BEFORE */}
      <div className="bg-[#0d1117] rounded-lg border border-red-500/20 overflow-hidden slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[9px] text-red-400 font-mono font-bold">BEFORE — FAILING</span>
        </div>
        <div className="p-3 font-mono text-[10px] space-y-1">
          <p className="text-slate-600">// checkout.spec.ts:42</p>
          <p className="text-slate-300">await page.click(</p>
          <p className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded mx-2">{"'[data-testid=\"submit-btn\"]'"}</p>
          <p className="text-slate-300">);</p>
          <p className="text-red-500 text-[9px] mt-1">✗ Element not found</p>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex items-center justify-center gap-2 slide-up" style={{ animationDelay: '1s' }}>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="relative w-8 h-8">
          <Image src="/logo-192.png" alt="" fill className="object-contain" />
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      </div>

      {/* AFTER */}
      <div className="bg-[#0d1117] rounded-lg border border-emerald-500/20 overflow-hidden success-glow slide-up" style={{ animationDelay: '1.5s' }}>
        <div className="px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] text-emerald-400 font-mono font-bold">AFTER — SELF-HEALED ✓</span>
        </div>
        <div className="p-3 font-mono text-[10px] space-y-1">
          <p className="text-slate-600">// checkout.spec.ts:42</p>
          <p className="text-slate-300">await page.click(</p>
          <p className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded mx-2">{"'button.checkout-submit-btn'"}</p>
          <p className="text-slate-300">);</p>
          <p className="text-emerald-400 text-[9px] mt-1">✓ Healed via Pattern Engine · 0 tokens · 0.8s</p>
        </div>
      </div>

      <p className="text-center text-emerald-400 text-xs font-bold slide-up" style={{ animationDelay: '3s' }}>
        ✅ Test re-run: PASSED
      </p>
    </div>
  );
}

/* Scene 4 — 3-Tier Engine (5s) */
function S4_ThreeTier() {
  return (
    <div className="w-full space-y-4 reel-fadein">
      <div className="text-center">
        <p className="text-xs text-emerald-400/60 tracking-[0.2em] uppercase slide-up">The Secret</p>
        <h2 className="text-xl font-extrabold text-white mt-2 text-slam" style={{ animationDelay: '0.2s' }}>3-Tier Healing Engine</h2>
        <p className="text-[10px] text-slate-500 mt-1 slide-up" style={{ animationDelay: '0.5s' }}>Most healings never need expensive AI</p>
      </div>

      <div className="space-y-2.5 stagger-children">
        {/* Tier 1 */}
        <div className="bg-[#0d1117] rounded-lg border border-blue-500/20 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-lg flex-shrink-0">⚙️</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400">Rule Engine</span>
              <span className="text-lg font-extrabold text-white font-mono">60%</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full beam-sweep" style={{ animationDelay: '0.5s' }} />
              </div>
              <span className="text-[9px] text-blue-400 font-bold">0 tokens</span>
            </div>
          </div>
        </div>

        {/* Tier 2 */}
        <div className="bg-[#0d1117] rounded-lg border border-cyan-500/20 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-lg flex-shrink-0">🧠</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">Pattern Engine</span>
              <span className="text-lg font-extrabold text-white font-mono">35%</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full beam-sweep" style={{ animationDelay: '0.8s', width: '58%' }} />
              </div>
              <span className="text-[9px] text-cyan-400 font-bold">0 tokens</span>
            </div>
          </div>
        </div>

        {/* Tier 3 */}
        <div className="bg-[#0d1117] rounded-lg border border-emerald-500/20 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-lg flex-shrink-0">🤖</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">AI Engine</span>
              <span className="text-lg font-extrabold text-white font-mono">5%</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full beam-sweep" style={{ animationDelay: '1.1s', width: '8%' }} />
              </div>
              <span className="text-[9px] text-emerald-400 font-bold">Minimal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center slide-up" style={{ animationDelay: '2s' }}>
        <span className="inline-block px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs">
          <span className="text-emerald-400 font-bold">95%</span><span className="text-white"> of healings use </span><span className="text-emerald-400 font-bold">ZERO</span><span className="text-white"> AI tokens</span>
        </span>
      </div>
    </div>
  );
}

/* Scene 5 — Stats (4.5s) */
function S5_Stats() {
  return (
    <div className="w-full space-y-5 reel-fadein">
      <div className="text-center">
        <p className="text-xs text-emerald-400/60 tracking-[0.2em] uppercase slide-up">The Impact</p>
        <h2 className="text-xl font-extrabold text-white mt-2 text-slam" style={{ animationDelay: '0.2s' }}>Results That Matter</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 stagger-children">
        <StatBox value="94%" label="Healing Success" gradient="from-emerald-400 to-emerald-600" />
        <StatBox value="99%" label="Cost Reduction" gradient="from-cyan-400 to-cyan-600" />
        <StatBox value="<2s" label="Heal Time" gradient="from-blue-400 to-blue-600" />
        <StatBox value="$0" label="Token Cost*" gradient="from-purple-400 to-purple-600" />
      </div>

      {/* ROI */}
      <div className="bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 rounded-xl border border-emerald-500/20 p-4 text-center slide-up" style={{ animationDelay: '1.5s' }}>
        <p className="text-[9px] text-emerald-400/60 uppercase tracking-wider">Annual Savings (5 QA Engineers)</p>
        <p className="text-3xl font-extrabold text-emerald-400 font-mono mt-1 num-glow">$127K</p>
      </div>

      <p className="text-center text-[8px] text-slate-600 slide-up" style={{ animationDelay: '2s' }}>*95% of healings use zero tokens</p>
    </div>
  );
}

/* Scene 6 — CTA (6s) */
function S6_CTA() {
  return (
    <div className="w-full text-center space-y-6 reel-fadein">
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-[30px] animate-pulse" />
        <Image src="/logo_full.png" alt="LevelUp" fill className="object-contain relative z-10" />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-extrabold text-white leading-tight text-slam">
          Stop fixing tests.<br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Start shipping.</span>
        </h2>
        <p className="text-xs text-slate-400 slide-up" style={{ animationDelay: '0.5s' }}>
          Self-healing test automation<br />that learns, saves, and scales.
        </p>
      </div>

      <div className="slide-up" style={{ animationDelay: '1s' }}>
        <div className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25">
          Get Early Access
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center justify-center gap-4 slide-up" style={{ animationDelay: '1.5s' }}>
        <div className="text-center">
          <p className="text-sm font-bold text-white font-mono">94%</p>
          <p className="text-[8px] text-slate-500">Success</p>
        </div>
        <div className="w-px h-5 bg-white/10" />
        <div className="text-center">
          <p className="text-sm font-bold text-white font-mono">99%</p>
          <p className="text-[8px] text-slate-500">Cost Save</p>
        </div>
        <div className="w-px h-5 bg-white/10" />
        <div className="text-center">
          <p className="text-sm font-bold text-white font-mono">&lt;2s</p>
          <p className="text-[8px] text-slate-500">Heal</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 slide-up" style={{ animationDelay: '2s' }}>
        <div className="relative w-4 h-4"><Image src="/logo-192.png" alt="" fill className="object-contain" /></div>
        <span className="text-[10px] text-slate-500 font-semibold">LevelUp AI QA</span>
        <span className="text-[10px] text-slate-600 mx-1">·</span>
        <span className="text-[10px] text-emerald-400/60">levelupaiqa.com</span>
      </div>
    </div>
  );
}

/* ============================================= */
/* HELPERS                                       */
/* ============================================= */

function StatBox({ value, label, gradient }: { value: string; label: string; gradient: string }) {
  return (
    <div className="bg-[#0d1117] rounded-xl border border-white/5 p-4 text-center">
      <p className={`text-2xl font-extrabold font-mono bg-gradient-to-b ${gradient} bg-clip-text text-transparent num-glow`}>{value}</p>
      <p className="text-[10px] text-slate-400 mt-1">{label}</p>
    </div>
  );
}

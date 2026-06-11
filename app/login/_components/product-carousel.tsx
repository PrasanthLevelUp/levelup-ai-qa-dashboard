'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Sparkles,
  GitBranch,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Slide {
  icon: LucideIcon;
  eyebrow: string;
  headline: string;
  subtext: string;
  /** Tailwind gradient classes for the slide accent */
  gradient: string;
  /** Decorative "mockup" rendered behind the copy */
  mockup: React.ReactNode;
}

/** A lightweight UI mockup made of simple bars/blocks to suggest a dashboard. */
function MockChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm shadow-2xl overflow-hidden">
      {/* window bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Bar({ w, color = 'bg-white/15' }: { w: string; color?: string }) {
  return <div className={`h-2.5 rounded-full ${color}`} style={{ width: w }} />;
}

const slides: Slide[] = [
  {
    icon: Brain,
    eyebrow: 'Intelligence Sources',
    headline: 'AI-Powered Intelligence',
    subtext: 'Real DOM data, code patterns, and business knowledge — all in one place.',
    gradient: 'from-violet-500 to-fuchsia-500',
    mockup: (
      <MockChrome>
        <div className="space-y-4">
          {[
            { label: 'DOM', color: 'bg-violet-400/70' },
            { label: 'Code', color: 'bg-fuchsia-400/70' },
            { label: 'Docs', color: 'bg-sky-400/70' },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-lg ${row.color} shrink-0`} />
              <div className="flex-1 space-y-1.5">
                <Bar w="40%" color="bg-white/25" />
                <Bar w="75%" />
              </div>
              <span className="text-[10px] font-medium text-emerald-300/80 bg-emerald-400/10 px-2 py-1 rounded-md">
                synced
              </span>
            </div>
          ))}
        </div>
      </MockChrome>
    ),
  },
  {
    icon: Sparkles,
    eyebrow: 'Script Generation',
    headline: 'Generate Tests in Seconds',
    subtext: 'From plain English to production-ready Playwright scripts.',
    gradient: 'from-emerald-500 to-teal-500',
    mockup: (
      <MockChrome>
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-xs text-slate-300/80">
              &ldquo;Log in and verify the dashboard loads&rdquo;
            </p>
          </div>
          <div className="flex justify-center">
            <span className="text-[10px] font-medium text-emerald-300/80 bg-emerald-400/10 px-2 py-1 rounded-md">
              ✨ generating…
            </span>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[10px] leading-relaxed space-y-1.5">
            <Bar w="55%" color="bg-emerald-400/50" />
            <Bar w="80%" color="bg-white/20" />
            <Bar w="65%" color="bg-white/20" />
            <Bar w="45%" color="bg-emerald-400/50" />
          </div>
        </div>
      </MockChrome>
    ),
  },
  {
    icon: GitBranch,
    eyebrow: 'RTM Dashboard',
    headline: 'Complete Traceability',
    subtext: 'Track every requirement from design to execution.',
    gradient: 'from-sky-500 to-blue-600',
    mockup: (
      <MockChrome>
        <div className="space-y-3">
          {[
            { req: 'REQ-101', pct: '100%', color: 'bg-emerald-400/70' },
            { req: 'REQ-102', pct: '80%', color: 'bg-sky-400/70' },
            { req: 'REQ-103', pct: '60%', color: 'bg-amber-400/70' },
          ].map((row) => (
            <div key={row.req} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-300/70 w-14 shrink-0">
                {row.req}
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: row.pct }} />
              </div>
              <span className="text-[10px] text-slate-300/70 w-9 text-right">{row.pct}</span>
            </div>
          ))}
        </div>
      </MockChrome>
    ),
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Intelligence Learning',
    headline: 'Self-Healing Tests',
    subtext: 'AI learns from failures and adapts your selectors automatically.',
    gradient: 'from-amber-500 to-orange-600',
    mockup: (
      <MockChrome>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-red-400/20 text-red-300 flex items-center justify-center text-xs shrink-0">
              ✕
            </span>
            <div className="flex-1 space-y-1.5">
              <Bar w="60%" color="bg-white/25" />
              <Bar w="40%" color="bg-red-400/40" />
            </div>
          </div>
          <div className="flex justify-center text-amber-300/80 text-lg leading-none">↓</div>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center text-xs shrink-0">
              ✓
            </span>
            <div className="flex-1 space-y-1.5">
              <Bar w="70%" color="bg-white/25" />
              <Bar w="50%" color="bg-emerald-400/50" />
            </div>
          </div>
        </div>
      </MockChrome>
    ),
  },
];

const ROTATE_MS = 5000;

export default function ProductCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((i: number) => setCurrent((i + slides.length) % slides.length), []);
  const next = useCallback(() => setCurrent((p) => (p + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="Product feature highlights"
    >
      {/* Ambient gradient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Brand mark */}
      <div className="absolute top-8 left-8 flex items-center gap-2 z-10">
        <span className="text-sm font-semibold text-white/90 tracking-tight">LevelUp AI</span>
        <span className="text-[10px] text-slate-400 border-l border-white/15 pl-2">
          QA Reliability Platform
        </span>
      </div>

      {/* Slides */}
      <div className="relative w-full max-w-lg px-10 flex-1 flex items-center justify-center">
        {slides.map((slide, i) => {
          const Icon = slide.icon;
          const active = current === i;
          return (
            <div
              key={i}
              className={`absolute inset-0 flex flex-col items-center justify-center gap-7 px-6 text-center transition-opacity duration-700 ease-in-out ${
                active ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              aria-hidden={!active}
            >
              {/* Mockup */}
              <div
                className={`transition-all duration-700 ${
                  active ? 'translate-y-0 scale-100' : 'translate-y-3 scale-95'
                }`}
              >
                {slide.mockup}
              </div>

              {/* Copy */}
              <div className="space-y-3">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${slide.gradient} bg-opacity-10`}
                >
                  <Icon size={14} className="text-white" />
                  <span className="text-[11px] font-medium text-white tracking-wide uppercase">
                    {slide.eyebrow}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{slide.headline}</h2>
                <p className="text-sm text-slate-300/80 max-w-sm mx-auto leading-relaxed">
                  {slide.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center z-10"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next slide"
        className="absolute right-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center z-10"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={current === i}
            className={`h-2 rounded-full transition-all duration-300 ${
              current === i ? 'w-7 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

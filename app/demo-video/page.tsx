'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

/* ─── Scene timing (ms) ─── */
const SCENE_DURATIONS = [
  5000,  // 0  Logo reveal
  6000,  // 1  The Problem
  5000,  // 2  The breaking point
  6000,  // 3  Meet the solution
  9000,  // 4  Live healing example
  7000,  // 5  3-Tier Engine
  6000,  // 6  The Numbers
  5000,  // 7  Who it's for
  8000,  // 8  CTA / Closing
];

const TOTAL_SCENES = SCENE_DURATIONS.length;

export default function DemoVideoPage() {
  const [scene, setScene] = useState(-1); // -1 = loading
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const controlTimerRef = useRef<NodeJS.Timeout | null>(null);

  const advanceScene = useCallback(() => {
    setScene(prev => {
      if (prev >= TOTAL_SCENES - 1) return prev;
      return prev + 1;
    });
  }, []);

  // Auto-advance
  useEffect(() => {
    if (scene === -1) {
      // Start after a brief delay
      const t = setTimeout(() => setScene(0), 800);
      return () => clearTimeout(t);
    }
    if (paused || scene >= TOTAL_SCENES - 1) return;
    timerRef.current = setTimeout(advanceScene, SCENE_DURATIONS[scene]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [scene, paused, advanceScene]);

  // Hide controls after inactivity
  useEffect(() => {
    if (controlTimerRef.current) clearTimeout(controlTimerRef.current);
    controlTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    return () => { if (controlTimerRef.current) clearTimeout(controlTimerRef.current); };
  }, [showControls]);

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const togglePause = () => setPaused(p => !p);
  const goToScene = (s: number) => setScene(Math.max(0, Math.min(s, TOTAL_SCENES - 1)));
  const restart = () => { setScene(-1); setPaused(false); };

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePause(); }
      if (e.key === 'ArrowRight') goToScene(scene + 1);
      if (e.key === 'ArrowLeft') goToScene(scene - 1);
      if (e.key === 'r') restart();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const progress = scene >= 0 ? ((scene + 1) / TOTAL_SCENES) * 100 : 0;

  return (
    <div
      className="fixed inset-0 bg-[#040810] overflow-hidden cursor-none select-none"
      onMouseMove={handleMouseMove}
      onClick={togglePause}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emerald-500/[0.03] blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/[0.04] blur-[100px]" style={{ animation: 'pulse 8s ease-in-out infinite' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* ─── SCENES ─── */}
      <div className="relative w-full h-full flex items-center justify-center">
        {scene === -1 && <LoadingScene />}
        {scene === 0 && <Scene0_LogoReveal />}
        {scene === 1 && <Scene1_TheProblem />}
        {scene === 2 && <Scene2_BreakingPoint />}
        {scene === 3 && <Scene3_TheSolution />}
        {scene === 4 && <Scene4_LiveExample />}
        {scene === 5 && <Scene5_ThreeTierEngine />}
        {scene === 6 && <Scene6_TheNumbers />}
        {scene === 7 && <Scene7_WhoItsFor />}
        {scene === 8 && <Scene8_CTA />}
      </div>

      {/* Progress bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-white/5 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Controls overlay */}
      <div className={`absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={(e) => { e.stopPropagation(); goToScene(scene - 1); }} className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all text-sm">◀</button>
        <button onClick={(e) => { e.stopPropagation(); togglePause(); }} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all font-bold">{paused ? '▶' : '⏸'}</button>
        <button onClick={(e) => { e.stopPropagation(); goToScene(scene + 1); }} className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all text-sm">▶</button>
        <button onClick={(e) => { e.stopPropagation(); restart(); }} className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all text-xs">↻</button>
        <span className="text-white/30 text-xs font-mono ml-2">{scene + 1}/{TOTAL_SCENES} {paused ? '(paused)' : ''}</span>
      </div>

      {/* Pause indicator */}
      {paused && scene >= 0 && (
        <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-white/50 text-xs font-medium tracking-wider uppercase">Paused — Click or press Space</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* SCENE COMPONENTS                                */
/* ═══════════════════════════════════════════════ */

function LoadingScene() {
  return (
    <div className="flex flex-col items-center gap-4 animate-pulse">
      <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
    </div>
  );
}

/* ─── Scene 0: Logo Reveal ─── */
function Scene0_LogoReveal() {
  return (
    <div className="flex flex-col items-center gap-8 cinematic-fadein">
      {/* Logo with glow */}
      <div className="relative">
        <div className="absolute inset-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-[60px] animate-pulse" />
        <div className="relative w-40 h-40 logo-zoom">
          <Image src="/logo_full.png" alt="LevelUp AI QA" fill className="object-contain drop-shadow-2xl" priority />
        </div>
      </div>

      {/* Brand text */}
      <div className="text-center space-y-3">
        <h1 className="text-6xl font-extrabold tracking-tight text-white text-reveal">
          LevelUp <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">AI QA</span>
        </h1>
        <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent line-expand" />
        <p className="text-xl text-slate-400 tracking-wide subtitle-fadein">Self-Healing Test Automation</p>
      </div>

      {/* Tagline */}
      <p className="text-sm text-slate-500 tracking-[0.3em] uppercase tagline-fadein">Your tests fix themselves</p>
    </div>
  );
}

/* ─── Scene 1: The Problem ─── */
function Scene1_TheProblem() {
  return (
    <div className="max-w-4xl mx-auto px-8 cinematic-fadein">
      <div className="text-center mb-12">
        <p className="text-emerald-400/60 text-sm tracking-[0.3em] uppercase mb-4 subtitle-fadein">The Problem</p>
        <h2 className="text-5xl font-bold text-white leading-tight text-reveal">
          Your Tests Break.<br />
          <span className="text-red-400">Every. Single. Sprint.</span>
        </h2>
      </div>

      {/* Failing terminal */}
      <div className="bg-[#0d1117] rounded-xl border border-red-500/20 overflow-hidden shadow-2xl shadow-red-500/5 terminal-slidein">
        <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-3 text-xs text-slate-500 font-mono">CI/CD Pipeline — test-suite.yml</span>
        </div>
        <div className="p-6 font-mono text-sm space-y-2">
          <TypingLine delay={0.3} color="text-slate-400">$ npx playwright test --project=chrome</TypingLine>
          <TypingLine delay={0.8} color="text-slate-500">Running 247 tests using 4 workers...</TypingLine>
          <TypingLine delay={1.4} color="text-green-400">  ✓ 198 passed</TypingLine>
          <TypingLine delay={1.8} color="text-red-400">  ✗ 12 failed</TypingLine>
          <TypingLine delay={2.2} color="text-yellow-400">  ⚠ 37 flaky</TypingLine>
          <TypingLine delay={2.8} color="text-red-500 font-bold">  Error: locator.click: Target element not found</TypingLine>
          <TypingLine delay={3.3} color="text-red-400/70">    selector: [data-testid=&quot;submit-btn&quot;]</TypingLine>
          <TypingLine delay={3.8} color="text-red-500">  ✗ Pipeline FAILED — blocking release v2.4.1</TypingLine>
        </div>
      </div>
    </div>
  );
}

/* ─── Scene 2: Breaking Point ─── */
function Scene2_BreakingPoint() {
  return (
    <div className="max-w-4xl mx-auto px-8 text-center cinematic-fadein">
      <div className="space-y-8">
        <h2 className="text-4xl font-bold text-white text-reveal">The Cost of Broken Tests</h2>
        <div className="grid grid-cols-3 gap-8 mt-12">
          {[
            { value: '4.2 hrs', label: 'Average debug time per broken test', icon: '⏱', delay: '0.3s' },
            { value: '$847', label: 'Cost per engineer per sprint on test fixes', icon: '💸', delay: '0.6s' },
            { value: '68%', label: 'Of teams delay releases due to flaky tests', icon: '🚫', delay: '0.9s' },
          ].map((stat, i) => (
            <div key={i} className="stat-card-fadein" style={{ animationDelay: stat.delay }}>
              <div className="bg-[#0d1117] rounded-2xl border border-red-500/10 p-8 space-y-4">
                <span className="text-4xl">{stat.icon}</span>
                <div className="text-4xl font-bold text-red-400 font-mono">{stat.value}</div>
                <p className="text-sm text-slate-400 leading-relaxed">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed tagline-fadein" style={{ animationDelay: '1.5s' }}>
          Your engineers should be building features,<br />
          <span className="text-red-400 font-semibold">not babysitting selectors.</span>
        </p>
      </div>
    </div>
  );
}

/* ─── Scene 3: The Solution ─── */
function Scene3_TheSolution() {
  return (
    <div className="max-w-4xl mx-auto px-8 text-center cinematic-fadein">
      <p className="text-emerald-400/60 text-sm tracking-[0.3em] uppercase mb-6 subtitle-fadein">The Solution</p>
      <h2 className="text-5xl font-bold text-white leading-tight text-reveal">
        What If Your Tests Could<br />
        <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">Heal Themselves?</span>
      </h2>

      <div className="mt-16 flex items-center justify-center gap-6">
        {/* Before */}
        <div className="flex flex-col items-center gap-3 stat-card-fadein" style={{ animationDelay: '0.5s' }}>
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-4xl">🔴</div>
          <span className="text-red-400 font-semibold">Test Fails</span>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center gap-2 stat-card-fadein" style={{ animationDelay: '1s' }}>
          <div className="relative w-48 h-1">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 rounded-full healing-beam" />
          </div>
          <div className="relative w-12 h-12">
            <Image src="/logo-192.png" alt="LevelUp" fill className="object-contain" />
          </div>
          <span className="text-xs text-slate-500 tracking-wider uppercase">AI Analyzes & Heals</span>
        </div>

        {/* After */}
        <div className="flex flex-col items-center gap-3 stat-card-fadein" style={{ animationDelay: '1.5s' }}>
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-4xl">🟢</div>
          <span className="text-emerald-400 font-semibold">Test Passes</span>
        </div>
      </div>

      <p className="mt-12 text-lg text-slate-400 tagline-fadein" style={{ animationDelay: '2s' }}>
        Automatic. Instant. <span className="text-emerald-400 font-semibold">Zero human intervention.</span>
      </p>
    </div>
  );
}

/* ─── Scene 4: Live Example ─── */
function Scene4_LiveExample() {
  return (
    <div className="max-w-5xl mx-auto px-8 cinematic-fadein">
      <div className="text-center mb-8">
        <p className="text-emerald-400/60 text-sm tracking-[0.3em] uppercase mb-3 subtitle-fadein">Live Healing Example</p>
        <h2 className="text-3xl font-bold text-white text-reveal">Watch the AI Fix a Broken Locator</h2>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Before */}
        <div className="stat-card-fadein" style={{ animationDelay: '0.3s' }}>
          <div className="bg-[#0d1117] rounded-xl border border-red-500/20 overflow-hidden">
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-red-400 font-mono font-bold">BEFORE — Test Failing</span>
            </div>
            <div className="p-5 font-mono text-xs space-y-1">
              <p className="text-slate-500">// checkout.spec.ts — Line 42</p>
              <p className="text-slate-300">await page.click(</p>
              <p className="text-red-400 bg-red-500/10 px-2 py-1 rounded mx-4">&apos;[data-testid=&quot;submit-btn&quot;]&apos;</p>
              <p className="text-slate-300">);</p>
              <div className="mt-4 pt-3 border-t border-white/5">
                <p className="text-red-400 text-xs">✗ Error: Target element not found</p>
                <p className="text-red-400/60 text-[10px] mt-1">Selector changed after UI redesign</p>
              </div>
            </div>
          </div>
        </div>

        {/* After */}
        <div className="stat-card-fadein" style={{ animationDelay: '1s' }}>
          <div className="bg-[#0d1117] rounded-xl border border-emerald-500/20 overflow-hidden">
            <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400 font-mono font-bold">AFTER — Self-Healed ✓</span>
            </div>
            <div className="p-5 font-mono text-xs space-y-1">
              <p className="text-slate-500">// checkout.spec.ts — Line 42</p>
              <p className="text-slate-300">await page.click(</p>
              <p className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded mx-4">&apos;button.checkout-submit-btn&apos;</p>
              <p className="text-slate-300">);</p>
              <div className="mt-4 pt-3 border-t border-white/5">
                <p className="text-emerald-400 text-xs">✓ Healed via Pattern Engine — 0 tokens</p>
                <p className="text-emerald-400/60 text-[10px] mt-1">Confidence: 96% | Time: 0.8s</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Healing process timeline */}
      <div className="mt-8 bg-[#0d1117] rounded-xl border border-white/5 p-6 terminal-slidein" style={{ animationDelay: '1.5s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-6 h-6">
            <Image src="/logo-192.png" alt="LevelUp" fill className="object-contain" />
          </div>
          <span className="text-xs text-slate-400 font-mono">LevelUp AI Healing Agent — Processing</span>
        </div>
        <div className="space-y-2 font-mono text-xs">
          <HealingStep delay={2} icon="🔍" text={'Detected failure: locator [data-testid="submit-btn"] not found'} color="text-yellow-400" />
          <HealingStep delay={2.8} icon="🧠" text="Analyzing DOM snapshot... found 3 candidate elements" color="text-blue-400" />
          <HealingStep delay={3.5} icon="⚡" text="Pattern Engine matched: testid-to-class migration pattern (seen 14 times)" color="text-cyan-400" />
          <HealingStep delay={4.2} icon="✅" text="Healed: button.checkout-submit-btn | Confidence: 96% | Strategy: Pattern Engine" color="text-emerald-400" />
          <HealingStep delay={5} icon="🎯" text="Re-running test... PASSED ✓ | Total healing time: 0.8s | Cost: $0.00" color="text-emerald-400 font-bold" />
        </div>
      </div>
    </div>
  );
}

/* ─── Scene 5: 3-Tier Engine ─── */
function Scene5_ThreeTierEngine() {
  return (
    <div className="max-w-5xl mx-auto px-8 text-center cinematic-fadein">
      <p className="text-emerald-400/60 text-sm tracking-[0.3em] uppercase mb-4 subtitle-fadein">The Architecture</p>
      <h2 className="text-4xl font-bold text-white mb-4 text-reveal">3-Tier Intelligent Healing Engine</h2>
      <p className="text-slate-400 mb-12 tagline-fadein" style={{ animationDelay: '0.5s' }}>Most healings never need expensive AI — saving you 99% on costs</p>

      <div className="grid grid-cols-3 gap-6">
        {/* Tier 1 */}
        <div className="stat-card-fadein" style={{ animationDelay: '0.5s' }}>
          <div className="bg-[#0d1117] rounded-2xl border border-blue-500/20 p-8 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
            <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-3xl mx-auto">⚙️</div>
            <h3 className="text-xl font-bold text-blue-400">Rule Engine</h3>
            <p className="text-3xl font-extrabold text-white font-mono">60%</p>
            <p className="text-xs text-slate-400">of healings resolved</p>
            <div className="mt-4 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <p className="text-blue-400 font-bold text-sm">0 tokens</p>
              <p className="text-[10px] text-slate-500">Deterministic rules, instant</p>
            </div>
          </div>
        </div>

        {/* Tier 2 */}
        <div className="stat-card-fadein" style={{ animationDelay: '1s' }}>
          <div className="bg-[#0d1117] rounded-2xl border border-cyan-500/20 p-8 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-cyan-400" />
            <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center text-3xl mx-auto">🧠</div>
            <h3 className="text-xl font-bold text-cyan-400">Pattern Engine</h3>
            <p className="text-3xl font-extrabold text-white font-mono">35%</p>
            <p className="text-xs text-slate-400">of healings resolved</p>
            <div className="mt-4 px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
              <p className="text-cyan-400 font-bold text-sm">0 tokens</p>
              <p className="text-[10px] text-slate-500">Learns from past fixes</p>
            </div>
          </div>
        </div>

        {/* Tier 3 */}
        <div className="stat-card-fadein" style={{ animationDelay: '1.5s' }}>
          <div className="bg-[#0d1117] rounded-2xl border border-emerald-500/20 p-8 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center text-3xl mx-auto">🤖</div>
            <h3 className="text-xl font-bold text-emerald-400">AI Engine</h3>
            <p className="text-3xl font-extrabold text-white font-mono">5%</p>
            <p className="text-xs text-slate-400">of healings need AI</p>
            <div className="mt-4 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-emerald-400 font-bold text-sm">Minimal tokens</p>
              <p className="text-[10px] text-slate-500">Only for novel failures</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-emerald-500/5 border border-emerald-500/10 tagline-fadein" style={{ animationDelay: '2s' }}>
        <span className="text-emerald-400 font-bold">Result:</span>
        <span className="text-white">95% of healings use <span className="text-emerald-400 font-bold font-mono">ZERO</span> AI tokens</span>
      </div>
    </div>
  );
}

/* ─── Scene 6: The Numbers ─── */
function Scene6_TheNumbers() {
  return (
    <div className="max-w-5xl mx-auto px-8 text-center cinematic-fadein">
      <p className="text-emerald-400/60 text-sm tracking-[0.3em] uppercase mb-4 subtitle-fadein">The Results</p>
      <h2 className="text-4xl font-bold text-white mb-12 text-reveal">Numbers That Speak</h2>

      <div className="grid grid-cols-4 gap-6">
        <div className="stat-card-fadein" style={{ animationDelay: '0.4s' }}>
          <div className="bg-[#0d1117] rounded-2xl border border-white/5 p-8 space-y-3">
            <p className="text-5xl font-extrabold font-mono bg-gradient-to-b from-emerald-400 to-emerald-600 bg-clip-text text-transparent number-countup">94%</p>
            <p className="text-sm text-slate-400">Healing Success Rate</p>
          </div>
        </div>
        <div className="stat-card-fadein" style={{ animationDelay: '0.7s' }}>
          <div className="bg-[#0d1117] rounded-2xl border border-white/5 p-8 space-y-3">
            <p className="text-5xl font-extrabold font-mono bg-gradient-to-b from-cyan-400 to-cyan-600 bg-clip-text text-transparent number-countup">99%</p>
            <p className="text-sm text-slate-400">Cost Reduction vs Pure AI</p>
          </div>
        </div>
        <div className="stat-card-fadein" style={{ animationDelay: '1.0s' }}>
          <div className="bg-[#0d1117] rounded-2xl border border-white/5 p-8 space-y-3">
            <p className="text-5xl font-extrabold font-mono bg-gradient-to-b from-blue-400 to-blue-600 bg-clip-text text-transparent number-countup">&lt;2s</p>
            <p className="text-sm text-slate-400">Average Healing Time</p>
          </div>
        </div>
        <div className="stat-card-fadein" style={{ animationDelay: '1.3s' }}>
          <div className="bg-[#0d1117] rounded-2xl border border-white/5 p-8 space-y-3">
            <p className="text-5xl font-extrabold font-mono bg-gradient-to-b from-purple-400 to-purple-600 bg-clip-text text-transparent number-countup">500+</p>
            <p className="text-sm text-slate-400">Patterns Learned & Growing</p>
          </div>
        </div>
      </div>

      {/* ROI highlight */}
      <div className="mt-10 bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 rounded-2xl border border-emerald-500/20 p-8 stat-card-fadein" style={{ animationDelay: '2s' }}>
        <p className="text-sm text-emerald-400/60 uppercase tracking-wider mb-2">Return on Investment</p>
        <p className="text-3xl font-bold text-white">
          For a team of <span className="text-emerald-400">5 QA engineers</span>, LevelUp saves
        </p>
        <p className="text-5xl font-extrabold text-emerald-400 font-mono mt-2">$127,000 / year</p>
        <p className="text-slate-400 mt-2 text-sm">in reduced debug time, faster releases, and eliminated AI API costs</p>
      </div>
    </div>
  );
}

/* ─── Scene 7: Who It's For ─── */
function Scene7_WhoItsFor() {
  return (
    <div className="max-w-4xl mx-auto px-8 text-center cinematic-fadein">
      <p className="text-emerald-400/60 text-sm tracking-[0.3em] uppercase mb-4 subtitle-fadein">Built For</p>
      <h2 className="text-4xl font-bold text-white mb-12 text-reveal">Teams That Ship Fast</h2>

      <div className="grid grid-cols-3 gap-8">
        {[
          {
            icon: '🚀',
            title: 'Startups',
            desc: 'Ship daily without test debt. Scale your QA without scaling your team.',
            delay: '0.4s'
          },
          {
            icon: '☁️',
            title: 'SaaS Companies',
            desc: 'Continuous deployment with confidence. Zero flaky test alerts at 3 AM.',
            delay: '0.8s'
          },
          {
            icon: '🏢',
            title: 'Enterprise QA',
            desc: 'Reduce test maintenance by 90%. Your automation engineers focus on strategy.',
            delay: '1.2s'
          },
        ].map((item, i) => (
          <div key={i} className="stat-card-fadein" style={{ animationDelay: item.delay }}>
            <div className="bg-[#0d1117] rounded-2xl border border-white/5 p-8 space-y-4 hover:border-emerald-500/20 transition-colors">
              <span className="text-5xl">{item.icon}</span>
              <h3 className="text-xl font-bold text-white">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-lg text-slate-300 tagline-fadein" style={{ animationDelay: '2s' }}>
        Trusted by teams running <span className="text-emerald-400 font-bold">Playwright, Cypress, Selenium & Puppeteer</span>
      </p>
    </div>
  );
}

/* ─── Scene 8: CTA ─── */
function Scene8_CTA() {
  return (
    <div className="max-w-3xl mx-auto px-8 text-center cinematic-fadein">
      {/* Logo */}
      <div className="relative w-28 h-28 mx-auto mb-8">
        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-[40px] animate-pulse" />
        <Image src="/logo_full.png" alt="LevelUp AI QA" fill className="object-contain relative z-10" />
      </div>

      <h2 className="text-5xl font-extrabold text-white leading-tight text-reveal">
        Stop Fixing Tests.<br />
        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Start Shipping Features.</span>
      </h2>

      <p className="mt-6 text-xl text-slate-400 tagline-fadein" style={{ animationDelay: '0.8s' }}>
        LevelUp AI QA — Self-healing test automation<br />that learns, saves, and scales with you.
      </p>

      <div className="mt-10 flex items-center justify-center gap-4 tagline-fadein" style={{ animationDelay: '1.5s' }}>
        <div className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-lg shadow-lg shadow-emerald-500/25">
          Get Early Access
        </div>
        <div className="px-8 py-4 rounded-xl border border-white/10 text-white font-medium text-lg hover:bg-white/5">
          Watch Demo
        </div>
      </div>

      <div className="mt-12 flex items-center justify-center gap-8 tagline-fadein" style={{ animationDelay: '2.5s' }}>
        <div className="text-center">
          <p className="text-2xl font-bold text-white font-mono">94%</p>
          <p className="text-xs text-slate-500">Success Rate</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-2xl font-bold text-white font-mono">99%</p>
          <p className="text-xs text-slate-500">Cost Savings</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-2xl font-bold text-white font-mono">&lt;2s</p>
          <p className="text-xs text-slate-500">Heal Time</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-2xl font-bold text-white font-mono">0</p>
          <p className="text-xs text-slate-500">Token Cost*</p>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-600">*95% of healings require zero AI tokens</p>

      <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
        <span className="relative w-5 h-5"><Image src="/logo-192.png" alt="" fill className="object-contain" /></span>
        <span>LevelUp AI QA</span>
        <span className="mx-2">·</span>
        <span className="text-emerald-400/60">levelupaiqa.com</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* HELPER COMPONENTS                               */
/* ═══════════════════════════════════════════════ */

function TypingLine({ delay, color, children }: { delay: number; color: string; children: React.ReactNode }) {
  return (
    <p className={`${color} typing-line`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </p>
  );
}

function HealingStep({ delay, icon, text, color }: { delay: number; icon: string; text: string; color: string }) {
  return (
    <p className={`${color} typing-line flex items-start gap-2`} style={{ animationDelay: `${delay}s` }}>
      <span>{icon}</span>
      <span>{text}</span>
    </p>
  );
}

'use client';

import { useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';

const CONTACT_EMAIL = 'prasanth.k@leveluptesting.in';

export default function ContactSection() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore; the mailto link still works.
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-[#334155]/70 text-center">
      <p className="text-sm font-medium text-slate-300">Don&apos;t have access?</p>
      <p className="text-xs text-slate-500 mt-1">
        Contact us to request access to LevelUp AI
      </p>

      <div className="mt-4 flex items-center justify-center gap-2">
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Request%20access%20to%20LevelUp%20AI`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 transition-colors text-sm font-medium"
        >
          <Mail size={15} />
          {CONTACT_EMAIL}
        </a>
        <button
          type="button"
          onClick={copyEmail}
          aria-label={copied ? 'Email copied' : 'Copy email address'}
          title={copied ? 'Copied!' : 'Copy email'}
          className="w-9 h-9 shrink-0 rounded-lg bg-[#0f172a] border border-[#334155] text-slate-400 hover:text-white hover:bg-[#334155] transition-colors flex items-center justify-center"
        >
          {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

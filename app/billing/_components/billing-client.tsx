'use client';

import { useState } from 'react';
import {
  CreditCard, Check, ArrowRight, Zap, Rocket, Crown, Building2,
  Star, Globe, AlertTriangle, Download, Calendar, Receipt,
  ChevronDown, ChevronUp, Sparkles, Shield, Clock, RefreshCw,
  BadgeCheck, Info, ExternalLink, Gauge
} from 'lucide-react';

type BillingCycle = 'monthly' | 'annually';

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'failed';
  plan: string;
}

/* Demo data simulating a Growth plan subscriber */
const CURRENT_PLAN = {
  id: 'growth',
  name: 'Growth',
  icon: Crown,
  monthlyPrice: '$999',
  annualPrice: '$799',
  billingCycle: 'monthly' as BillingCycle,
  nextBillingDate: '2026-06-19',
  creditsTotal: 5000,
  creditsUsed: 3247,
  usersTotal: 25,
  usersActive: 12,
  reposTotal: -1, // unlimited
  reposUsed: 8,
  retentionDays: 90,
  startDate: '2026-04-19',
};

const PLANS = [
  {
    id: 'free', name: 'Free POC', icon: Zap, monthlyUSD: '0', annualUSD: '0',
    credits: 50, users: 1, repos: '1', retention: '7 days',
    gradient: 'from-slate-500/10', border: 'border-slate-500/20', color: 'slate',
  },
  {
    id: 'starter', name: 'Starter', icon: Rocket, monthlyUSD: '149', annualUSD: '119',
    credits: 500, users: 5, repos: '5', retention: '30 days',
    gradient: 'from-blue-500/10', border: 'border-blue-500/20', color: 'blue',
  },
  {
    id: 'growth', name: 'Growth', icon: Crown, monthlyUSD: '999', annualUSD: '799',
    credits: 5000, users: 25, repos: 'Unlimited', retention: '90 days',
    gradient: 'from-emerald-500/10', border: 'border-emerald-500/30', color: 'emerald',
    popular: true,
  },
  {
    id: 'enterprise', name: 'Enterprise', icon: Building2, monthlyUSD: 'Custom', annualUSD: 'Custom',
    credits: -1, users: -1, repos: 'Unlimited', retention: 'Unlimited',
    gradient: 'from-amber-500/10', border: 'border-amber-500/20', color: 'amber',
  },
];

const INVOICES: Invoice[] = [
  { id: 'INV-2026-005', date: '2026-05-19', amount: '$999.00', status: 'paid', plan: 'Growth' },
  { id: 'INV-2026-004', date: '2026-04-19', amount: '$999.00', status: 'paid', plan: 'Growth' },
  { id: 'INV-2026-003', date: '2026-03-19', amount: '$149.00', status: 'paid', plan: 'Starter' },
  { id: 'INV-2026-002', date: '2026-02-19', amount: '$149.00', status: 'paid', plan: 'Starter' },
  { id: 'INV-2026-001', date: '2026-01-19', amount: '$0.00', status: 'paid', plan: 'Free POC' },
];

const PAYMENT_METHODS = [
  { type: 'card', last4: '4242', brand: 'Visa', expiry: '12/28', isDefault: true },
  { type: 'card', last4: '8888', brand: 'Mastercard', expiry: '06/27', isDefault: false },
];

export default function BillingClient() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [showInvoices, setShowInvoices] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);

  const creditsPercent = Math.round((CURRENT_PLAN.creditsUsed / CURRENT_PLAN.creditsTotal) * 100);
  const creditsRemaining = CURRENT_PLAN.creditsTotal - CURRENT_PLAN.creditsUsed;
  const isNearLimit = creditsPercent >= 80;

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CreditCard size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
            <p className="text-sm text-slate-400">Manage your plan, credits, and payment methods</p>
          </div>
        </div>
      </div>

      {/* Credit Usage Alert */}
      {isNearLimit && (
        <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">Credits running low</p>
            <p className="text-xs text-slate-400 mt-0.5">
              You&apos;ve used {creditsPercent}% of your monthly Quality Operations credits.
              Rule-based healings (free) will continue, but AI-heavy operations may pause.
              <button className="text-amber-400 underline ml-1">Upgrade plan</button>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ─── Left column: Current Plan + Usage ─── */}
        <div className="xl:col-span-2 space-y-6">
          {/* Current Plan Card */}
          <div className="rounded-2xl bg-gradient-to-b from-emerald-500/10 to-[#1e293b]/60 border border-emerald-500/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Crown size={24} className="text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{CURRENT_PLAN.name} Plan</h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">Active</span>
                  </div>
                  <p className="text-sm text-slate-400">Since {new Date(CURRENT_PLAN.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{CURRENT_PLAN.monthlyPrice}<span className="text-sm text-slate-500">/mo</span></div>
                <p className="text-xs text-slate-500">Billed monthly</p>
              </div>
            </div>

            {/* Credit Usage Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Gauge size={14} className="text-emerald-400" />
                  <span className="text-sm font-medium text-white">Quality Operations Credits</span>
                </div>
                <span className="text-sm text-slate-400">
                  <span className={isNearLimit ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                    {CURRENT_PLAN.creditsUsed.toLocaleString()}
                  </span>
                  {' / '}{CURRENT_PLAN.creditsTotal.toLocaleString()} used
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    isNearLimit ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  }`}
                  style={{ width: `${Math.min(creditsPercent, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-slate-500">{creditsRemaining.toLocaleString()} credits remaining</span>
                <span className="text-xs text-slate-500">Resets {CURRENT_PLAN.nextBillingDate}</span>
              </div>
            </div>

            {/* Plan Limits Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Team Members', value: `${CURRENT_PLAN.usersActive}/${CURRENT_PLAN.usersTotal}`, icon: Shield },
                { label: 'Repositories', value: CURRENT_PLAN.reposTotal === -1 ? `${CURRENT_PLAN.reposUsed} (Unlimited)` : `${CURRENT_PLAN.reposUsed}/${CURRENT_PLAN.reposTotal}`, icon: Globe },
                { label: 'Data Retention', value: `${CURRENT_PLAN.retentionDays} days`, icon: Clock },
                { label: 'Next Billing', value: new Date(CURRENT_PLAN.nextBillingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), icon: Calendar },
              ].map((item, i) => (
                <div key={i} className="rounded-xl bg-[#0f172a]/60 border border-slate-700/40 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon size={12} className="text-slate-500" />
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowChangePlan(!showChangePlan)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Change Plan
              </button>
              <button className="px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-white text-sm font-medium rounded-xl border border-slate-600/50 transition-colors">
                Cancel Subscription
              </button>
            </div>
          </div>

          {/* Change Plan Selector */}
          {showChangePlan && (
            <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Switch Plan</h3>
                <div className="inline-flex items-center bg-[#0f172a] rounded-lg p-1 border border-slate-700/50">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      billingCycle === 'monthly' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('annually')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                      billingCycle === 'annually' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    Annual <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-bold">-20%</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PLANS.map((plan) => {
                  const isCurrent = plan.id === CURRENT_PLAN.id;
                  const price = billingCycle === 'monthly' ? plan.monthlyUSD : plan.annualUSD;
                  const Icon = plan.icon;
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-xl bg-gradient-to-b ${plan.gradient} to-transparent border ${
                        isCurrent ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : plan.border
                      } p-4 relative`}
                    >
                      {isCurrent && (
                        <div className="absolute -top-2 right-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">Current</span>
                        </div>
                      )}
                      <Icon size={18} className={`text-${plan.color}-400 mb-2`} />
                      <h4 className="text-sm font-bold text-white mb-1">{plan.name}</h4>
                      <div className="mb-3">
                        {price === 'Custom' ? (
                          <span className="text-lg font-bold text-white">Custom</span>
                        ) : price === '0' ? (
                          <span className="text-lg font-bold text-white">Free</span>
                        ) : (
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-xs text-slate-500">$</span>
                            <span className="text-lg font-bold text-white">{price}</span>
                            <span className="text-xs text-slate-500">/mo</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-400 mb-3">
                        <div>{plan.credits === -1 ? 'Unlimited' : plan.credits.toLocaleString()} credits</div>
                        <div>{plan.users === -1 ? 'Unlimited' : plan.users} users</div>
                        <div>{plan.repos} repos</div>
                      </div>
                      <button
                        disabled={isCurrent}
                        className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                          isCurrent
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : `bg-${plan.color}-500/10 hover:bg-${plan.color}-500/20 text-${plan.color}-400 border border-${plan.color}-500/30`
                        }`}
                      >
                        {isCurrent ? 'Current Plan' : plan.id === 'enterprise' ? 'Contact Sales' : 'Switch'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Credit Usage Breakdown */}
          <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
            <h3 className="text-lg font-bold text-white mb-4">This Month&apos;s Credit Usage</h3>
            <div className="space-y-3">
              {[
                { operation: 'AI-powered healing', credits: 1850, count: 370, icon: Sparkles, color: 'amber' },
                { operation: 'Script generation', credits: 640, count: 64, icon: Zap, color: 'blue' },
                { operation: 'Coverage generation', credits: 400, count: 50, icon: Shield, color: 'purple' },
                { operation: 'RCA analysis', credits: 207, count: 69, icon: AlertTriangle, color: 'red' },
                { operation: 'Release signoff', credits: 100, count: 20, icon: BadgeCheck, color: 'emerald' },
                { operation: 'PR automation', credits: 50, count: 17, icon: Globe, color: 'cyan' },
                { operation: 'Pattern healing', credits: 0, count: 843, icon: Shield, color: 'slate', free: true },
                { operation: 'Rule healing', credits: 0, count: 2104, icon: Shield, color: 'slate', free: true },
              ].map((item, i) => {
                const pct = CURRENT_PLAN.creditsTotal > 0 ? (item.credits / CURRENT_PLAN.creditsTotal) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-40 flex items-center gap-2 shrink-0">
                      <item.icon size={14} className={`text-${item.color}-400`} />
                      <span className="text-xs text-slate-300 truncate">{item.operation}</span>
                    </div>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.free ? 'bg-slate-600' : `bg-${item.color}-500`}`}
                        style={{ width: `${Math.max(pct, item.free ? 0 : 0.5)}%` }}
                      />
                    </div>
                    <div className="w-24 text-right shrink-0">
                      {item.free ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">FREE</span>
                      ) : (
                        <span className="text-xs font-semibold text-white">{item.credits.toLocaleString()} cr</span>
                      )}
                    </div>
                    <span className="w-16 text-right text-[10px] text-slate-500 shrink-0">{item.count.toLocaleString()} ops</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
              <span className="text-sm text-slate-400">Total operations this month</span>
              <span className="text-sm font-bold text-white">3,537 operations · 3,247 credits</span>
            </div>
          </div>

          {/* Invoice History */}
          <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
            <button
              onClick={() => setShowInvoices(!showInvoices)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-slate-400" />
                <h3 className="text-lg font-bold text-white">Invoice History</h3>
              </div>
              {showInvoices ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            {showInvoices && (
              <div className="mt-4 space-y-2">
                {INVOICES.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0f172a]/60 border border-slate-700/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Receipt size={14} className="text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-white">{inv.id}</span>
                        <p className="text-[10px] text-slate-500">{inv.plan} Plan · {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-white">{inv.amount}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                        inv.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>{inv.status}</span>
                      <button className="text-slate-500 hover:text-white transition-colors">
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right column: Payment Methods + Quick Stats ─── */}
        <div className="space-y-6">
          {/* Payment Methods */}
          <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Payment Methods</h3>
              <button className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">+ Add</button>
            </div>
            <div className="space-y-3">
              {PAYMENT_METHODS.map((pm, i) => (
                <div key={i} className={`rounded-xl p-4 border transition-colors ${
                  pm.isDefault ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#0f172a]/60 border-slate-700/40'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">
                        {pm.brand === 'Visa' ? 'VISA' : 'MC'}
                      </div>
                      <div>
                        <span className="text-sm text-white font-medium">···· {pm.last4}</span>
                        <p className="text-[10px] text-slate-500">Expires {pm.expiry}</p>
                      </div>
                    </div>
                    {pm.isDefault && (
                      <span className="text-[9px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Default</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Payment gateway badges */}
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Supported Gateways</p>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-[#0f172a]/60 border border-slate-700/40 text-[10px] font-bold text-blue-400">Stripe</div>
                <div className="px-3 py-1.5 rounded-lg bg-[#0f172a]/60 border border-slate-700/40 text-[10px] font-bold text-blue-400">Razorpay</div>
                <div className="px-3 py-1.5 rounded-lg bg-[#0f172a]/60 border border-slate-700/40 text-[10px] font-bold text-slate-500">UPI</div>
              </div>
            </div>
          </div>

          {/* Billing Summary */}
          <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Billing Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Current MRR', value: '$999', color: 'emerald' },
                { label: 'Total Paid', value: '$2,296', color: 'blue' },
                { label: 'Credits Avg/Day', value: '108', color: 'amber' },
                { label: 'Cost Per Operation', value: '$0.28', color: 'purple' },
                { label: 'AI Savings Rate', value: '94%', color: 'emerald' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                  <span className="text-xs text-slate-400">{item.label}</span>
                  <span className={`text-sm font-bold text-${item.color}-400`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GST / Tax Info */}
          <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Tax & Compliance</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">GST Number</span>
                <span className="text-xs text-slate-300 font-mono">29AADCL0123A1ZP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Billing Country</span>
                <span className="text-xs text-slate-300">India</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Tax Rate</span>
                <span className="text-xs text-slate-300">18% GST</span>
              </div>
            </div>
            <button className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              <ExternalLink size={11} /> Update billing details
            </button>
          </div>

          {/* Enterprise CTA */}
          <div className="rounded-2xl bg-gradient-to-b from-amber-500/5 to-transparent border border-amber-500/20 p-5">
            <Building2 size={20} className="text-amber-400 mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">Need more?</h4>
            <p className="text-xs text-slate-400 mb-3">Enterprise plans include unlimited credits, private deployment, SSO, and dedicated SLA.</p>
            <button className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              Contact Sales <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

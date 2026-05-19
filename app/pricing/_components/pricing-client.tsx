'use client';

import { useState } from 'react';
import {
  Zap, Shield, Building2, Rocket, Check, X, HelpCircle,
  ArrowRight, Star, Crown, Sparkles, ChevronDown, ChevronUp,
  CreditCard, BarChart3, Lock, Users, Globe, Server,
  Gauge, Brain, FlaskConical, GitPullRequest, Bug, Microscope,
  ClipboardCheck, ShieldAlert, Database, Fingerprint, Activity,
  Info, BadgeCheck, Cpu
} from 'lucide-react';

/* ─── types ─── */
type BillingCycle = 'monthly' | 'annually';
type Currency = 'USD' | 'INR';

interface PlanConfig {
  id: string;
  name: string;
  tagline: string;
  icon: React.ElementType;
  popular?: boolean;
  enterprise?: boolean;
  priceUSD: { monthly: string; annually: string };
  priceINR: { monthly: string; annually: string };
  credits: string;
  highlightFeatures: string[];
  cta: string;
  gradient: string;
  border: string;
  iconBg: string;
  iconColor: string;
}

const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free POC',
    tagline: 'Prove ROI risk-free',
    icon: Zap,
    priceUSD: { monthly: '0', annually: '0' },
    priceINR: { monthly: '0', annually: '0' },
    credits: '50 credits/mo',
    highlightFeatures: [
      '25 healing jobs/month',
      '10 AI healings',
      '5 script generations',
      '10 coverage generations',
      'Basic RCA analysis',
      '1 GitHub repo',
      '1 team member',
      '7-day data retention',
    ],
    cta: 'Start Free Trial',
    gradient: 'from-slate-500/10 to-slate-600/5',
    border: 'border-slate-500/20',
    iconBg: 'bg-slate-500/10',
    iconColor: 'text-slate-400',
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For small QA teams',
    icon: Rocket,
    priceUSD: { monthly: '149', annually: '119' },
    priceINR: { monthly: '9,999', annually: '7,999' },
    credits: '500 credits/mo',
    highlightFeatures: [
      '300 healing jobs/month',
      '100 AI healings',
      '50 script generations',
      '100 coverage generations',
      '5 GitHub repos',
      'Slack & Jira integration',
      'Release Risk reports',
      '5 team members',
      '30-day data retention',
    ],
    cta: 'Get Started',
    gradient: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For scaling QA teams',
    icon: Crown,
    popular: true,
    priceUSD: { monthly: '999', annually: '799' },
    priceINR: { monthly: '60,000', annually: '48,000' },
    credits: '5,000 credits/mo',
    highlightFeatures: [
      '2,000 healing jobs/month',
      '1,000 AI healings',
      '500 script generations',
      '1,000 coverage generations',
      'Unlimited repos',
      'DOM Memory & Learning Engine',
      'Similarity Engine',
      'Advanced Release Risk & Signoff',
      'Full API access',
      '25 team members',
      '90-day data retention',
    ],
    cta: 'Scale Your QA',
    gradient: 'from-emerald-500/10 to-emerald-600/5',
    border: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Custom for your org',
    icon: Building2,
    enterprise: true,
    priceUSD: { monthly: 'Custom', annually: 'Custom' },
    priceINR: { monthly: 'Custom', annually: 'Custom' },
    credits: 'Unlimited',
    highlightFeatures: [
      'Unlimited everything',
      'SSO / SAML authentication',
      'RBAC & audit logs',
      'Private AI models',
      'Private deployment / on-prem',
      'Dedicated support & SLA',
      'Custom AI model training',
      'IP/device tracking',
      'Unlimited data retention',
    ],
    cta: 'Contact Sales',
    gradient: 'from-amber-500/10 to-amber-600/5',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
];

/* ─── Quality Operations credit table ─── */
const CREDIT_TABLE = [
  { operation: 'Rule-based healing', credits: 0, icon: Shield, desc: 'Deterministic fix — zero AI cost' },
  { operation: 'Pattern-based healing', credits: 1, icon: Brain, desc: 'Reuses learned patterns' },
  { operation: 'AI-powered healing', credits: 5, icon: Sparkles, desc: 'LLM analysis + code generation' },
  { operation: 'RCA analysis', credits: 3, icon: Microscope, desc: 'Root cause + environment intelligence' },
  { operation: 'Script generation', credits: 10, icon: FlaskConical, desc: 'Full test script from requirements' },
  { operation: 'Coverage generation', credits: 8, icon: BarChart3, desc: 'Test coverage gap analysis' },
  { operation: 'Release signoff', credits: 5, icon: ClipboardCheck, desc: 'Automated release decision' },
  { operation: 'PR automation', credits: 3, icon: GitPullRequest, desc: 'Branch + PR creation' },
];

/* ─── feature comparison matrix ─── */
interface FeatureRow {
  feature: string;
  category: string;
  free: string | boolean;
  starter: string | boolean;
  growth: string | boolean;
  enterprise: string | boolean;
}

const FEATURE_MATRIX: FeatureRow[] = [
  // Core Healing
  { feature: 'Healing jobs / month', category: 'Core Healing', free: '25', starter: '300', growth: '2,000', enterprise: 'Unlimited' },
  { feature: 'AI-powered healings', category: 'Core Healing', free: '10', starter: '100', growth: '1,000', enterprise: 'Unlimited' },
  { feature: 'Rule & Pattern healing', category: 'Core Healing', free: true, starter: true, growth: true, enterprise: true },
  { feature: 'Confidence scoring', category: 'Core Healing', free: true, starter: true, growth: true, enterprise: true },
  // Automation
  { feature: 'Script generation', category: 'Automation', free: '5', starter: '50', growth: '500', enterprise: 'Unlimited' },
  { feature: 'Coverage generation', category: 'Automation', free: '10', starter: '100', growth: '1,000', enterprise: 'Unlimited' },
  { feature: 'PR automation', category: 'Automation', free: false, starter: true, growth: true, enterprise: true },
  { feature: 'GitHub repos', category: 'Automation', free: '1', starter: '5', growth: 'Unlimited', enterprise: 'Unlimited' },
  // Intelligence
  { feature: 'Basic RCA', category: 'Intelligence', free: true, starter: true, growth: true, enterprise: true },
  { feature: 'RCA Intelligence', category: 'Intelligence', free: false, starter: false, growth: true, enterprise: true },
  { feature: 'Release Risk scoring', category: 'Intelligence', free: false, starter: true, growth: 'Advanced', enterprise: 'Advanced' },
  { feature: 'Release Signoff assistant', category: 'Intelligence', free: false, starter: false, growth: 'Advanced', enterprise: 'Advanced' },
  { feature: 'Learning Engine', category: 'Intelligence', free: false, starter: false, growth: true, enterprise: true },
  { feature: 'Similarity Engine', category: 'Intelligence', free: false, starter: false, growth: true, enterprise: true },
  { feature: 'DOM Memory', category: 'Intelligence', free: false, starter: false, growth: true, enterprise: true },
  { feature: 'Flaky test detection', category: 'Intelligence', free: false, starter: true, growth: true, enterprise: true },
  // Integrations
  { feature: 'Slack integration', category: 'Integrations', free: true, starter: true, growth: true, enterprise: true },
  { feature: 'Jira integration', category: 'Integrations', free: false, starter: true, growth: true, enterprise: true },
  { feature: 'Microsoft Teams', category: 'Integrations', free: false, starter: false, growth: true, enterprise: true },
  { feature: 'API access', category: 'Integrations', free: false, starter: false, growth: true, enterprise: true },
  { feature: 'Webhooks', category: 'Integrations', free: false, starter: false, growth: true, enterprise: true },
  // Platform
  { feature: 'Team members', category: 'Platform', free: '1', starter: '5', growth: '25', enterprise: 'Unlimited' },
  { feature: 'Data retention', category: 'Platform', free: '7 days', starter: '30 days', growth: '90 days', enterprise: 'Unlimited' },
  { feature: 'Analytics dashboard', category: 'Platform', free: true, starter: true, growth: true, enterprise: true },
  { feature: 'ROI dashboard', category: 'Platform', free: false, starter: true, growth: true, enterprise: true },
  // Enterprise
  { feature: 'SSO / SAML', category: 'Enterprise', free: false, starter: false, growth: false, enterprise: true },
  { feature: 'RBAC & audit logs', category: 'Enterprise', free: false, starter: false, growth: false, enterprise: true },
  { feature: 'Private deployment', category: 'Enterprise', free: false, starter: false, growth: false, enterprise: true },
  { feature: 'Custom AI models', category: 'Enterprise', free: false, starter: false, growth: false, enterprise: true },
  { feature: 'Dedicated support & SLA', category: 'Enterprise', free: false, starter: false, growth: false, enterprise: true },
  { feature: 'On-prem option', category: 'Enterprise', free: false, starter: false, growth: false, enterprise: true },
];

const FAQS = [
  {
    q: 'What are Quality Operations credits?',
    a: 'Quality Operations are our value-based billing units. Unlike raw token or API-call pricing, credits map to real outcomes — a healed test, a generated script, or a release signoff. Rule-based healings cost 0 credits because they use zero AI tokens.',
  },
  {
    q: 'What happens if I exceed my credit limit?',
    a: 'You\'ll receive a notification at 80% usage. After the limit, rule-based and pattern-based healings continue (they\'re free), but AI-heavy operations pause until the next billing cycle — or you can upgrade instantly.',
  },
  {
    q: 'Can I try the platform before committing?',
    a: 'Absolutely. The Free POC plan gives you 25 healing jobs and 50 credits per month — enough to prove ROI on a real project. No credit card required.',
  },
  {
    q: 'Do you offer annual discounts?',
    a: 'Yes — save 20% with annual billing on all paid plans. Enterprise customers can negotiate multi-year contracts with additional discounts.',
  },
  {
    q: 'How does the Enterprise plan work?',
    a: 'Enterprise pricing is customized based on your team size, execution volume, AI usage, and deployment model (cloud or on-prem). Contact our sales team for a tailored quote.',
  },
  {
    q: 'Which payment methods are supported?',
    a: 'We accept credit/debit cards and bank transfers via Stripe (global) and Razorpay (India — UPI, cards, netbanking). GST invoices are available for Indian customers.',
  },
  {
    q: 'Is there a free trial on paid plans?',
    a: 'We offer a 14-day pilot period where we help you integrate, configure, and measure real ROI before your first invoice.',
  },
  {
    q: 'Can I switch plans mid-cycle?',
    a: 'Yes. Upgrade anytime and only pay the prorated difference. Downgrades take effect at the next billing cycle.',
  },
];

/* ─── Component ─── */
export default function PricingClient() {
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showFullComparison, setShowFullComparison] = useState(false);

  const getPrice = (plan: PlanConfig) => {
    const prices = currency === 'USD' ? plan.priceUSD : plan.priceINR;
    return prices[billing];
  };

  const currencySymbol = currency === 'USD' ? '$' : '₹';

  const categories = [...new Set(FEATURE_MATRIX.map(f => f.category))];

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CreditCard size={14} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Pricing</span>
            </div>
          </div>

          <h1 className="text-center text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Pay for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">Quality Operations</span>,
            <br className="hidden sm:block" />
            Not Tokens
          </h1>
          <p className="text-center text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            Value-based pricing that scales with your outcomes. Rule-based healings are always free.
            Only pay when AI does the heavy lifting.
          </p>

          {/* Billing & Currency toggles */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            {/* Billing toggle */}
            <div className="inline-flex items-center bg-[#1e293b] rounded-lg p-1 border border-slate-700/50">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billing === 'monthly'
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('annually')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  billing === 'annually'
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Annual
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">-20%</span>
              </button>
            </div>

            {/* Currency toggle */}
            <div className="inline-flex items-center bg-[#1e293b] rounded-lg p-1 border border-slate-700/50">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  currency === 'USD'
                    ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe size={14} /> USD
              </button>
              <button
                onClick={() => setCurrency('INR')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  currency === 'INR'
                    ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-sm">₹</span> INR
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing Cards ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const price = getPrice(plan);
            const Icon = plan.icon;
            const isPopular = plan.popular;
            const isEnterprise = plan.enterprise;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl bg-gradient-to-b ${plan.gradient} border ${plan.border} p-6 flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                  isPopular ? 'ring-2 ring-emerald-500/40 shadow-emerald-500/10 shadow-xl' : ''
                }`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/30">
                      <Star size={12} /> Most Popular
                    </div>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div className={`w-10 h-10 rounded-xl ${plan.iconBg} flex items-center justify-center mb-3`}>
                    <Icon size={20} className={plan.iconColor} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-400">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  {isEnterprise ? (
                    <div>
                      <span className="text-3xl font-bold text-white">Custom</span>
                      <p className="text-xs text-slate-500 mt-1">Tailored to your scale</p>
                    </div>
                  ) : price === '0' ? (
                    <div>
                      <span className="text-4xl font-bold text-white">Free</span>
                      <p className="text-xs text-slate-500 mt-1">No credit card required</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg text-slate-400">{currencySymbol}</span>
                        <span className="text-4xl font-bold text-white">{price}</span>
                        <span className="text-sm text-slate-500">/mo</span>
                      </div>
                      {billing === 'annually' && (
                        <p className="text-xs text-emerald-400 mt-1">Billed annually · Save 20%</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Credits badge */}
                <div className="mb-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
                    <Gauge size={13} className="text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-300">{plan.credits}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.highlightFeatures.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-300">{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    isPopular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                      : isEnterprise
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-700/50 hover:bg-slate-700 text-white border border-slate-600/50'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Quality Operations Credits ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Cpu size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Quality Operations Credits</h2>
              <p className="text-sm text-slate-400">Transparent, value-based billing — not raw tokens</p>
            </div>
          </div>

          <p className="text-slate-400 text-sm max-w-3xl mb-8">
            Every operation maps to a real QA outcome. Rule-based and pattern-based healings cost little or nothing
            because they don&apos;t use AI tokens. You only spend credits on high-value AI operations.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREDIT_TABLE.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.operation}
                  className="rounded-xl bg-[#0f172a]/60 border border-slate-700/40 p-4 hover:border-emerald-500/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-slate-400" />
                      <span className="text-sm font-medium text-white">{item.operation}</span>
                    </div>
                    <span
                      className={`text-lg font-bold ${
                        item.credits === 0
                          ? 'text-emerald-400'
                          : item.credits <= 3
                          ? 'text-blue-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {item.credits === 0 ? 'FREE' : item.credits}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                  {item.credits === 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <BadgeCheck size={10} className="text-emerald-400" />
                      <span className="text-[10px] font-semibold text-emerald-400">Zero AI cost</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Key insight */}
          <div className="mt-6 flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
            <Info size={16} className="text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-emerald-400">Smart cost optimization:</span>{' '}
              Our 3-tier healing engine tries rule-based (free) and pattern-based (1 credit) strategies first.
              AI is only invoked when deterministic methods can&apos;t resolve the failure — saving you up to 99% on AI costs.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Feature Comparison ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Full Feature Comparison</h2>
          <p className="text-slate-400 text-sm">Every feature across every plan, side by side</p>
        </div>

        <div className="rounded-2xl bg-[#1e293b]/40 border border-slate-700/50 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-0 text-sm font-semibold border-b border-slate-700/50 bg-[#1e293b]/80">
            <div className="p-4 text-slate-400">Feature</div>
            <div className="p-4 text-center text-slate-400">Free POC</div>
            <div className="p-4 text-center text-blue-400">Starter</div>
            <div className="p-4 text-center text-emerald-400">Growth</div>
            <div className="p-4 text-center text-amber-400">Enterprise</div>
          </div>

          {/* Rows */}
          {categories.map((cat) => {
            const rows = FEATURE_MATRIX.filter(f => f.category === cat);
            const visibleRows = showFullComparison ? rows : rows.slice(0, 3);
            const hasMore = rows.length > 3 && !showFullComparison;

            return (
              <div key={cat}>
                {/* Category header */}
                <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-700/30">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{cat}</span>
                </div>
                {visibleRows.map((row, idx) => (
                  <div
                    key={row.feature}
                    className={`grid grid-cols-5 gap-0 text-sm border-b border-slate-800/50 ${
                      idx % 2 === 0 ? 'bg-[#0f172a]/20' : ''
                    }`}
                  >
                    <div className="p-3 px-4 text-slate-300 text-sm">{row.feature}</div>
                    {(['free', 'starter', 'growth', 'enterprise'] as const).map((planKey) => {
                      const val = row[planKey];
                      return (
                        <div key={planKey} className="p-3 flex items-center justify-center">
                          {val === true ? (
                            <Check size={16} className="text-emerald-400" />
                          ) : val === false ? (
                            <X size={16} className="text-slate-600" />
                          ) : (
                            <span className="text-sm text-slate-300 font-medium">{val}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Show more/less */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setShowFullComparison(!showFullComparison)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {showFullComparison ? 'Show Less' : 'Show All Features'}
            {showFullComparison ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </section>

      {/* ─── Go-to-Market Phases ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">How Companies Adopt LevelUp</h2>
          <p className="text-slate-400 text-sm">A proven 3-phase journey from proof of concept to full enterprise rollout</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              phase: 'Phase 1',
              title: 'Free POC',
              duration: '2–4 weeks',
              desc: 'Prove ROI on a real project. Zero risk, zero cost. See measurable results before any commitment.',
              icon: Zap,
              color: 'emerald',
              gradient: 'from-emerald-500/10 to-transparent',
            },
            {
              phase: 'Phase 2',
              title: 'Pilot',
              duration: '1–3 months',
              desc: 'Stabilize workflows across your QA team. Integrate with CI/CD, Slack, Jira. Measure cost savings.',
              icon: Rocket,
              color: 'blue',
              gradient: 'from-blue-500/10 to-transparent',
            },
            {
              phase: 'Phase 3',
              title: 'Enterprise Contract',
              duration: 'Annual',
              desc: 'Full rollout with SSO, RBAC, private deployment, dedicated support, and custom SLA.',
              icon: Building2,
              color: 'amber',
              gradient: 'from-amber-500/10 to-transparent',
            },
          ].map((p, i) => (
            <div key={i} className={`rounded-2xl bg-gradient-to-b ${p.gradient} border border-slate-700/50 p-6 relative`}>
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-bold uppercase tracking-wider text-${p.color}-400`}>{p.phase}</span>
                <span className="text-xs text-slate-500">· {p.duration}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-${p.color}-500/10 flex items-center justify-center mb-3`}>
                <p.icon size={20} className={`text-${p.color}-400`} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
              {i < 2 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight size={18} className="text-slate-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── ROI Selling Point ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-[#1e293b]/60 to-blue-500/10 border border-emerald-500/20 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">You&apos;re Not Buying an AI Tool</h2>
          <p className="text-lg text-slate-300 mb-6 max-w-2xl mx-auto">
            You&apos;re investing in a <span className="text-emerald-400 font-semibold">Release Reliability Platform</span> that
            reduces QA maintenance cost, eliminates release risk, and accelerates your entire delivery pipeline.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { label: 'Manual Fix Cost', value: '$75/hr', sub: 'Industry average' },
              { label: 'Avg Time Saved', value: '30min', sub: 'Per healed test' },
              { label: 'AI Cost Reduction', value: 'Up to 99%', sub: 'Rule + pattern first' },
              { label: 'Release Confidence', value: '↑ 40%', sub: 'With signoff assistant' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{stat.value}</div>
                <div className="text-sm text-white font-medium mt-1">{stat.label}</div>
                <div className="text-xs text-slate-500">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Frequently Asked Questions</h2>
          <p className="text-slate-400 text-sm">Everything you need to know about pricing and plans</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-[#1e293b]/50 border border-slate-700/50 overflow-hidden"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
                {expandedFaq === idx ? (
                  <ChevronUp size={16} className="text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-slate-400 shrink-0" />
                )}
              </button>
              {expandedFaq === idx && (
                <div className="px-4 pb-4 border-t border-slate-700/30 pt-3">
                  <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Enterprise CTA ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/5 via-[#1e293b]/60 to-amber-500/5 border border-amber-500/20 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={20} className="text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Enterprise</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Need a custom solution?</h3>
            <p className="text-sm text-slate-400 max-w-lg">
              Banks, fintech, healthcare, and enterprise SaaS teams need private deployment, SSO, RBAC,
              custom AI models, and dedicated SLAs. Let&apos;s build the right plan for your organization.
            </p>
          </div>
          <button className="shrink-0 px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 font-semibold text-sm transition-colors flex items-center gap-2">
            Contact Sales
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

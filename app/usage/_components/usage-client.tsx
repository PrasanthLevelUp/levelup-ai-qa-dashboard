'use client';

import { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Gauge, Zap, Sparkles, Shield, Brain,
  Microscope, FlaskConical, ClipboardCheck, GitPullRequest,
  Calendar, ArrowUpRight, ArrowDownRight, Info, DollarSign,
  Clock, Activity, Filter
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

type Period = '7d' | '30d' | '90d';

/* ─── Demo data ─── */
function generateDailyUsage(days: number) {
  const data = [];
  const now = new Date(2026, 4, 19); // May 19, 2026
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const base = 80 + Math.floor(Math.random() * 60);
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalOps: base + Math.floor(Math.random() * 40),
      credits: Math.floor(base * 0.7 + Math.random() * 30),
      ruleHealing: Math.floor(base * 0.5 + Math.random() * 20),
      patternHealing: Math.floor(base * 0.2 + Math.random() * 10),
      aiHealing: Math.floor(base * 0.1 + Math.random() * 8),
      scriptGen: Math.floor(Math.random() * 5),
      coverageGen: Math.floor(Math.random() * 4),
      rca: Math.floor(Math.random() * 6),
    });
  }
  return data;
}

const DAILY_DATA_30 = generateDailyUsage(30);
const DAILY_DATA_7 = DAILY_DATA_30.slice(-7);
const DAILY_DATA_90 = generateDailyUsage(90);

const OPERATION_BREAKDOWN = [
  { name: 'Rule Healing', value: 2104, credits: 0, color: '#64748b', icon: Shield, perUnit: 0 },
  { name: 'Pattern Healing', value: 843, credits: 0, color: '#8b5cf6', icon: Brain, perUnit: 1 },
  { name: 'AI Healing', value: 370, credits: 1850, color: '#f59e0b', icon: Sparkles, perUnit: 5 },
  { name: 'RCA Analysis', value: 69, credits: 207, color: '#ef4444', icon: Microscope, perUnit: 3 },
  { name: 'Script Gen', value: 64, credits: 640, color: '#3b82f6', icon: FlaskConical, perUnit: 10 },
  { name: 'Coverage Gen', value: 50, credits: 400, color: '#06b6d4', icon: FlaskConical, perUnit: 8 },
  { name: 'Release Signoff', value: 20, credits: 100, color: '#10b981', icon: ClipboardCheck, perUnit: 5 },
  { name: 'PR Automation', value: 17, credits: 51, color: '#a855f7', icon: GitPullRequest, perUnit: 3 },
];

const CREDIT_PIE_DATA = OPERATION_BREAKDOWN.filter(o => o.credits > 0).map(o => ({
  name: o.name,
  value: o.credits,
  color: o.color,
}));

const MONTHLY_TREND = [
  { month: 'Jan', credits: 0, ops: 45 },
  { month: 'Feb', credits: 210, ops: 320 },
  { month: 'Mar', credits: 890, ops: 1240 },
  { month: 'Apr', credits: 2100, ops: 2680 },
  { month: 'May', credits: 3247, ops: 3537 },
];

export default function UsageClient() {
  const [period, setPeriod] = useState<Period>('30d');

  const dailyData = useMemo(() => {
    if (period === '7d') return DAILY_DATA_7;
    if (period === '90d') return DAILY_DATA_90;
    return DAILY_DATA_30;
  }, [period]);

  const totalOps = OPERATION_BREAKDOWN.reduce((s, o) => s + o.value, 0);
  const totalCredits = OPERATION_BREAKDOWN.reduce((s, o) => s + o.credits, 0);
  const freeOps = OPERATION_BREAKDOWN.filter(o => o.credits === 0).reduce((s, o) => s + o.value, 0);
  const freePercent = Math.round((freeOps / totalOps) * 100);

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <BarChart3 size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Usage Dashboard</h1>
            <p className="text-sm text-slate-400">Track your Quality Operations and credit consumption</p>
          </div>
        </div>

        <div className="inline-flex items-center bg-[#1e293b] rounded-lg p-1 border border-slate-700/50">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === p ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Operations', value: totalOps.toLocaleString(), change: '+18%', up: true, icon: Activity, color: 'emerald' },
          { label: 'Credits Consumed', value: totalCredits.toLocaleString(), change: '+24%', up: true, icon: Gauge, color: 'blue' },
          { label: 'Free Operations', value: `${freePercent}%`, change: '+3%', up: true, icon: Shield, color: 'purple' },
          { label: 'Avg Cost/Operation', value: '$0.28', change: '-12%', up: false, icon: DollarSign, color: 'amber' },
        ].map((card, i) => (
          <div key={i} className="rounded-xl bg-[#1e293b]/60 border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{card.label}</span>
              <card.icon size={14} className={`text-${card.color}-400`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{card.value}</span>
              <span className={`text-xs font-semibold flex items-center gap-0.5 ${
                card.up ? 'text-emerald-400' : 'text-emerald-400'
              }`}>
                {card.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {card.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ─── Left: Charts ─── */}
        <div className="xl:col-span-2 space-y-6">
          {/* Daily Operations Trend */}
          <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Daily Operations Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="opsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="creditFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="totalOps" stroke="#10b981" fill="url(#opsFill)" strokeWidth={2} name="Operations" />
                  <Area type="monotone" dataKey="credits" stroke="#3b82f6" fill="url(#creditFill)" strokeWidth={2} name="Credits" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Operations by Type - Stacked Bar */}
          <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Daily Breakdown by Type</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="ruleHealing" stackId="a" fill="#64748b" name="Rule Healing" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="patternHealing" stackId="a" fill="#8b5cf6" name="Pattern Healing" />
                  <Bar dataKey="aiHealing" stackId="a" fill="#f59e0b" name="AI Healing" />
                  <Bar dataKey="scriptGen" stackId="a" fill="#3b82f6" name="Script Gen" />
                  <Bar dataKey="rca" stackId="a" fill="#ef4444" name="RCA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Growth */}
          <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Monthly Growth (2026)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="ops" fill="#10b981" name="Operations" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="credits" fill="#3b82f6" name="Credits" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ─── Right: Breakdowns ─── */}
        <div className="space-y-6">
          {/* Credit Distribution Pie */}
          <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Credit Distribution</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CREDIT_PIE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {CREDIT_PIE_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {CREDIT_PIE_DATA.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-400">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-white">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Operation Details Table */}
          <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Operation Details</h3>
            <div className="space-y-2">
              {OPERATION_BREAKDOWN.map((op, i) => {
                const Icon = op.icon;
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0f172a]/60 border border-slate-700/40">
                    <div className="flex items-center gap-2">
                      <Icon size={13} style={{ color: op.color }} />
                      <div>
                        <span className="text-xs font-medium text-white">{op.name}</span>
                        <p className="text-[10px] text-slate-500">{op.perUnit} cr/op</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-white">{op.value.toLocaleString()} ops</div>
                      <div className={`text-[10px] font-bold ${
                        op.credits === 0 ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {op.credits === 0 ? 'FREE' : `${op.credits.toLocaleString()} cr`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Savings Insight */}
          <div className="rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase">Cost Insight</span>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              <span className="text-emerald-400 font-bold">{freePercent}%</span> of your operations used zero credits this month thanks to rule & pattern healing.
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Estimated savings</span>
              <span className="font-bold text-emerald-400">$14,715/mo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

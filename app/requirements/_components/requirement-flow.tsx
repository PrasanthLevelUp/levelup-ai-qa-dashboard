'use client';

import { CheckCircle2, Circle, ArrowRight, FileText, TestTube2, Code2, PlayCircle } from 'lucide-react';

/**
 * RequirementFlow — compact horizontal stepper visualising the traceability
 * chain for a single requirement: Requirement → Test Cases → Scripts → Executions.
 * Counts come straight from the requirements list aggregates so it works without
 * an extra fetch; a step is "complete" once its count is > 0.
 */
interface RequirementFlowProps {
  testCaseCount: number;
  scriptCount: number;
  executionCount: number;
  coveragePercentage?: number;
}

export default function RequirementFlow({
  testCaseCount,
  scriptCount,
  executionCount,
  coveragePercentage,
}: RequirementFlowProps) {
  const steps = [
    { name: 'Requirement', count: 1, complete: true, icon: FileText },
    { name: 'Test Cases', count: testCaseCount, complete: testCaseCount > 0, icon: TestTube2 },
    { name: 'Scripts', count: scriptCount, complete: scriptCount > 0, icon: Code2 },
    { name: 'Executions', count: executionCount, complete: executionCount > 0, icon: PlayCircle },
  ];

  return (
    <div className="rounded-lg border border-slate-700 bg-[#0f172a] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Traceability Flow</h4>
        {typeof coveragePercentage === 'number' && (
          <span className="text-xs text-slate-400">Coverage {Math.round(coveragePercentage)}%</span>
        )}
      </div>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.name} className="flex flex-1 items-center">
              <div className="flex flex-col items-center text-center">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${
                    step.complete
                      ? 'border-green-500 bg-green-500/15'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  {step.complete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-500" />
                  )}
                </div>
                <div className="mt-1.5">
                  <div className="flex items-center justify-center gap-1 text-xs font-medium text-slate-200">
                    <Icon className="h-3 w-3 text-slate-400" />
                    {step.name}
                  </div>
                  <span
                    className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] ${
                      step.complete ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {step.count}
                  </span>
                </div>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="mx-2 h-4 w-4 shrink-0 text-slate-600" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

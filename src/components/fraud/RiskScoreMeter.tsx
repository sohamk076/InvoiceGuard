import React from 'react';
import { FraudSeverity } from '../../lib/fraud-engine/types';

interface RiskScoreMeterProps {
  score: number;
  level: FraudSeverity;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
}

export const RiskScoreMeter: React.FC<RiskScoreMeterProps> = ({
  score,
  level,
  criticalCount = 0,
  highCount = 0,
  mediumCount = 0,
  lowCount = 0,
}) => {
  const getLevelLabel = (lvl: FraudSeverity) => {
    switch (lvl) {
      case 'CRITICAL':
        return 'Critical Risk Level';
      case 'HIGH':
        return 'High Risk Level';
      case 'MEDIUM':
        return 'Medium Risk Level';
      case 'LOW':
        return 'Low Risk Level';
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Fraud Risk Assessment Score
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-mono text-slate-900">{score}</span>
            <span className="text-sm text-slate-400 font-mono">/ 100</span>
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-800">
          {getLevelLabel(level)}
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-slate-800 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(3, score))}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-4">
        <span>0 (Clean)</span>
        <span>25 (Notice)</span>
        <span>50 (High)</span>
        <span>80 (Critical)</span>
        <span>100</span>
      </div>

      {/* Flag counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-center">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-xs text-slate-600 font-medium">Critical</div>
          <div className="text-sm font-semibold text-slate-900 font-mono mt-0.5">
            {criticalCount}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-xs text-slate-600 font-medium">High</div>
          <div className="text-sm font-semibold text-slate-900 font-mono mt-0.5">
            {highCount}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-xs text-slate-600 font-medium">Medium</div>
          <div className="text-sm font-semibold text-slate-900 font-mono mt-0.5">
            {mediumCount}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-xs text-slate-600 font-medium">Low</div>
          <div className="text-sm font-semibold text-slate-900 font-mono mt-0.5">
            {lowCount}
          </div>
        </div>
      </div>
    </div>
  );
};

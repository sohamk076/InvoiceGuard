import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FraudFinding, FraudSeverity } from '../../lib/fraud-engine/types';

interface FindingsListProps {
  findings: FraudFinding[];
}

export const FindingsList: React.FC<FindingsListProps> = ({ findings }) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!findings || findings.length === 0) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900">Zero Compliance Violations Detected</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          All deterministic checks passed: GSTIN format, arithmetic balance, tax split, duplicate registry, and purchase order consistency.
        </p>
      </div>
    );
  }

  const getSeverityLabel = (severity: FraudSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'Critical';
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      case 'LOW':
        return 'Low';
    }
  };

  return (
    <div className="space-y-3">
      {findings.map((finding) => {
        const isExpanded = expandedIds[finding.id] ?? true;

        return (
          <div
            key={finding.id}
            className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm transition-all"
          >
            <div
              onClick={() => toggleExpand(finding.id)}
              className="p-4 sm:p-5 flex items-start justify-between cursor-pointer hover:bg-slate-50/70 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-slate-700">
                    [{getSeverityLabel(finding.severity).toUpperCase()}]
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {finding.ruleId}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-900">{finding.ruleName}</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{finding.message}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className="text-xs font-mono font-semibold text-slate-700">
                  +{finding.penaltyPoints} pts
                </span>
                <button className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/60 space-y-3 text-xs">
                {/* Evidence parameters */}
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Audit Evidence:</span>
                  <div className="bg-white rounded-xl border border-slate-200/90 p-3 font-mono text-[11px] text-slate-700 overflow-x-auto shadow-sm">
                    {Object.entries(finding.evidence).map(([key, val]) => (
                      <div key={key} className="flex gap-2 py-0.5">
                        <span className="text-slate-500 min-w-[140px]">{key}:</span>
                        <span className="text-slate-900 font-semibold">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Action */}
                <div className="p-3 border border-slate-200/90 rounded-xl bg-white shadow-sm">
                  <span className="font-semibold text-slate-800 block mb-0.5">
                    Recommended Remediation:
                  </span>
                  <p className="text-slate-700 leading-relaxed">{finding.suggestedAction}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

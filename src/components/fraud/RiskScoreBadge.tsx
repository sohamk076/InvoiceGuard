import React from 'react';
import { FraudSeverity } from '../../lib/fraud-engine/types';

interface RiskScoreBadgeProps {
  score: number;
  level?: FraudSeverity;
  showScore?: boolean;
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({
  score,
  level,
  showScore = true,
}) => {
  let determinedLevel: FraudSeverity = level || 'LOW';
  if (!level) {
    if (score >= 80) determinedLevel = 'CRITICAL';
    else if (score >= 50) determinedLevel = 'HIGH';
    else if (score >= 20) determinedLevel = 'MEDIUM';
    else determinedLevel = 'LOW';
  }

  const labels = {
    LOW: 'Low Risk',
    MEDIUM: 'Medium Risk',
    HIGH: 'High Risk',
    CRITICAL: 'Critical Risk',
  };

  return (
    <span className="text-xs text-slate-800 font-medium">
      {labels[determinedLevel]}
      {showScore && <span className="font-mono text-slate-500 ml-1.5">({score}/100)</span>}
    </span>
  );
};

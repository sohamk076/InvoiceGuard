import {
  FraudFinding,
  FraudScanResult,
  FraudSeverity,
  HistoricalContext,
  InvoicePayload,
} from './types';
import { checkDuplicateInvoice } from './rules/duplicate';
import { checkGstinCompliance } from './rules/gstin';
import { checkMathReconciliation } from './rules/math';
import { checkSuspiciousDates } from './rules/dates';
import { checkUnusualAmounts } from './rules/amounts';
import { checkPurchaseOrderMatch } from './rules/po-match';

/**
 * Deterministic Rule-Based Fraud Detection Engine
 * Analyzes invoices against financial compliance, tax verification, arithmetic reconciliation,
 * duplicate detection, timeline consistency, and 3-way PO matching.
 */
export function runFraudScan(
  invoice: InvoicePayload,
  context: HistoricalContext = { existingInvoices: [] }
): FraudScanResult {
  const allFindings: FraudFinding[] = [];

  // 1. Math and Line Items Reconciliation
  const mathResult = checkMathReconciliation(invoice);
  allFindings.push(...mathResult.findings);

  // 2. GSTIN & Tax Law Compliance
  const gstinFindings = checkGstinCompliance(invoice);
  allFindings.push(...gstinFindings);

  // 3. Duplicate Invoices
  const duplicateFindings = checkDuplicateInvoice(invoice, context);
  allFindings.push(...duplicateFindings);

  // 4. Suspicious Dates & Timeline
  const dateFindings = checkSuspiciousDates(invoice, context);
  allFindings.push(...dateFindings);

  // 5. Amount Anomaly & Historical Spend
  const amountFindings = checkUnusualAmounts(invoice, context);
  allFindings.push(...amountFindings);

  // 6. 3-Way PO Matching
  const poFindings = checkPurchaseOrderMatch(invoice, context);
  allFindings.push(...poFindings);

  // Calculate Aggregated Score
  let totalPenalty = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const finding of allFindings) {
    totalPenalty += finding.penaltyPoints;
    switch (finding.severity) {
      case 'CRITICAL':
        criticalCount++;
        break;
      case 'HIGH':
        highCount++;
        break;
      case 'MEDIUM':
        mediumCount++;
        break;
      case 'LOW':
        lowCount++;
        break;
    }
  }

  // Cap risk score between 0 and 100
  const overallRiskScore = Math.min(100, Math.max(0, totalPenalty));

  // Determine risk level based on normalized thresholds
  let riskLevel: FraudSeverity = 'LOW';
  if (overallRiskScore >= 80 || criticalCount > 0) {
    riskLevel = 'CRITICAL';
  } else if (overallRiskScore >= 50 || highCount > 0) {
    riskLevel = 'HIGH';
  } else if (overallRiskScore >= 20 || mediumCount > 0) {
    riskLevel = 'MEDIUM';
  }

  return {
    invoiceId: invoice.id,
    overallRiskScore,
    riskLevel,
    totalFlags: allFindings.length,
    criticalFlagsCount: criticalCount,
    highFlagsCount: highCount,
    mediumFlagsCount: mediumCount,
    lowFlagsCount: lowCount,
    findings: allFindings,
    mathReconciliation: mathResult.reconciliation,
    scannedAt: new Date().toISOString(),
  };
}

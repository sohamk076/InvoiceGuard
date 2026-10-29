import { FraudFinding, HistoricalContext, InvoicePayload } from '../types';

/**
 * Checks for amount anomalies, vendor spend deviation, and threshold structuring.
 */
export function checkUnusualAmounts(
  invoice: InvoicePayload,
  context: HistoricalContext
): FraudFinding[] {
  const findings: FraudFinding[] = [];

  // 1. Vendor Spend Spike (Deviation from historical average)
  if (context.vendorsStats && invoice.supplierGstin) {
    const stats = context.vendorsStats[invoice.supplierGstin.trim().toUpperCase()];

    if (stats && stats.totalInvoicesCount >= 2 && stats.averageInvoiceAmount > 0) {
      const multiplier = invoice.grandTotal / stats.averageInvoiceAmount;

      if (multiplier >= 3.0) {
        findings.push({
          id: 'amount-spend-spike',
          ruleId: 'RULE-AMT-01',
          ruleName: 'Unusual Vendor Spend Spike',
          category: 'AMOUNTS',
          severity: multiplier >= 5.0 ? 'HIGH' : 'MEDIUM',
          penaltyPoints: multiplier >= 5.0 ? 30 : 20,
          message: `Invoice total of ₹${invoice.grandTotal.toLocaleString('en-IN')} is ${multiplier.toFixed(1)}x higher than this vendor's historical average of ₹${stats.averageInvoiceAmount.toLocaleString('en-IN')}.`,
          evidence: {
            currentAmount: invoice.grandTotal,
            vendorAverage: stats.averageInvoiceAmount,
            deviationMultiplier: Number(multiplier.toFixed(2)),
            historicalCount: stats.totalInvoicesCount,
          },
          suggestedAction:
            'Conduct dual-signoff executive review to confirm scope expansion before releasing funds.',
        });
      }
    }
  }

  // 2. Structuring / Threshold Evasion (Invoices just below common Indian approval/TDS thresholds)
  // Common Indian corporate/TDS thresholds: ₹50,000 (PAN reporting / Cash limit), ₹1,00,000 (standard Level 1 signoff), ₹2,00,000
  const thresholds = [
    { target: 50000, lower: 48500, label: '₹50,000 reporting threshold' },
    { target: 100000, lower: 97500, label: '₹1,00,000 approval limit' },
    { target: 200000, lower: 195000, label: '₹2,00,000 senior audit limit' },
    { target: 500000, lower: 490000, label: '₹5,00,000 executive limit' },
  ];

  for (const t of thresholds) {
    if (invoice.grandTotal >= t.lower && invoice.grandTotal < t.target) {
      findings.push({
        id: `amount-threshold-${t.target}`,
        ruleId: 'RULE-AMT-02',
        ruleName: 'Potential Threshold Evasion (Structuring)',
        category: 'AMOUNTS',
        severity: 'MEDIUM',
        penaltyPoints: 15,
        message: `Amount ₹${invoice.grandTotal.toLocaleString('en-IN')} is directly below the ${t.label}. This pattern frequently indicates deliberate split billing to bypass approval workflows.`,
        evidence: {
          invoiceTotal: invoice.grandTotal,
          targetThreshold: t.target,
          thresholdLabel: t.label,
        },
        suggestedAction:
          'Audit recent invoices from this vendor to verify if orders were split into smaller batches.',
      });
      break;
    }
  }

  // 3. Perfect Round Number with Complex GST
  // In GST, line item taxes (e.g. 18%) usually produce decimal fractions. Perfect round numbers on multi-item invoices often indicate estimates rather than exact billing.
  if (
    invoice.items &&
    invoice.items.length >= 2 &&
    invoice.grandTotal >= 10000 &&
    invoice.grandTotal % 1000 === 0 &&
    (invoice.totalTax || 0) > 0
  ) {
    findings.push({
      id: 'amount-round-number-estimate',
      ruleId: 'RULE-AMT-03',
      ruleName: 'Estimated / Round Number Invoice',
      category: 'AMOUNTS',
      severity: 'LOW',
      penaltyPoints: 10,
      message: `Invoice grand total is an exact round figure of ₹${invoice.grandTotal.toLocaleString('en-IN')} despite multiple tax-bearing line items.`,
      evidence: {
        grandTotal: invoice.grandTotal,
        itemsCount: invoice.items.length,
        totalTax: invoice.totalTax,
      },
      suggestedAction:
        'Verify supporting delivery challans or timesheets to confirm actual billing rather than milestone estimates.',
    });
  }

  return findings;
}

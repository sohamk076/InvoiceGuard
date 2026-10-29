import { FraudFinding, InvoicePayload } from '../types';
import { safeRound } from '../../gst';

export interface MathReconciliation {
  calculatedSubtotal: number;
  statedSubtotal: number;
  calculatedTax: number;
  statedTax: number;
  calculatedGrandTotal: number;
  statedGrandTotal: number;
  discrepancy: number;
  isBalanced: boolean;
}

/**
 * Validates invoice line items, tax rate calculations, and subtotal/grand total math.
 */
export function checkMathReconciliation(invoice: InvoicePayload): {
  findings: FraudFinding[];
  reconciliation: MathReconciliation;
} {
  const findings: FraudFinding[] = [];

  let calculatedSubtotal = 0;
  let calculatedTax = 0;

  // Validate line items
  (invoice.items || []).forEach((item, index) => {
    const rawLineTaxable = item.quantity * item.unitPrice - (item.discountAmount || 0);
    const expectedTaxable = safeRound(rawLineTaxable);

    if (Math.abs(item.taxableAmount - expectedTaxable) > 1.0) {
      findings.push({
        id: `math-line-taxable-${index}`,
        ruleId: 'RULE-MATH-01',
        ruleName: 'Line Item Taxable Value Mismatch',
        category: 'TAX_MATH',
        severity: 'MEDIUM',
        penaltyPoints: 20,
        message: `Line #${index + 1} ("${item.itemDescription}") states taxable value ₹${item.taxableAmount.toFixed(2)}, but ${item.quantity} × ₹${item.unitPrice.toFixed(2)} minus discount computes to ₹${expectedTaxable.toFixed(2)}.`,
        evidence: {
          lineNumber: index + 1,
          statedTaxable: item.taxableAmount,
          computedTaxable: expectedTaxable,
          discrepancy: Math.abs(item.taxableAmount - expectedTaxable),
        },
        suggestedAction: 'Require vendor to correct arithmetic error on invoice line.',
      });
    }

    // Check tax calculation on line item
    const expectedLineTax = safeRound(item.taxableAmount * (item.gstRate / 100));
    const itemStatedTax = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);

    if (itemStatedTax > 0 && Math.abs(itemStatedTax - expectedLineTax) > 1.0) {
      findings.push({
        id: `math-line-tax-${index}`,
        ruleId: 'RULE-MATH-02',
        ruleName: 'Line Item GST Rate Mismatch',
        category: 'TAX_MATH',
        severity: 'MEDIUM',
        penaltyPoints: 25,
        message: `Line #${index + 1} applied tax of ₹${itemStatedTax.toFixed(2)}, which diverges from ${item.gstRate}% GST on ₹${item.taxableAmount.toFixed(2)} (expected ₹${expectedLineTax.toFixed(2)}).`,
        evidence: {
          lineNumber: index + 1,
          gstRatePercent: item.gstRate,
          statedTax: itemStatedTax,
          expectedTax: expectedLineTax,
        },
        suggestedAction: 'Investigate potential inflated tax rate or calculation error.',
      });
    }

    calculatedSubtotal += item.taxableAmount;
    calculatedTax += expectedLineTax;
  });

  calculatedSubtotal = safeRound(calculatedSubtotal);
  calculatedTax = safeRound(calculatedTax);

  const calculatedGrandTotal = safeRound(calculatedSubtotal + calculatedTax);
  const statedGrandTotal = invoice.grandTotal;
  const discrepancy = safeRound(Math.abs(calculatedGrandTotal - statedGrandTotal));

  // Grand Total Discrepancy
  if (discrepancy > 1.0) {
    const isOvercharge = statedGrandTotal > calculatedGrandTotal;
    findings.push({
      id: 'math-grand-total-mismatch',
      ruleId: 'RULE-MATH-03',
      ruleName: isOvercharge ? 'Grand Total Overbilling Discrepancy' : 'Grand Total Arithmetic Discrepancy',
      category: 'TAX_MATH',
      severity: discrepancy > 100 ? 'HIGH' : 'MEDIUM',
      penaltyPoints: discrepancy > 100 ? 35 : 20,
      message: `Invoice grand total of ₹${statedGrandTotal.toFixed(2)} does not equal computed sum of subtotal (₹${calculatedSubtotal.toFixed(2)}) + tax (₹${calculatedTax.toFixed(2)}) = ₹${calculatedGrandTotal.toFixed(2)}. Difference: ₹${discrepancy.toFixed(2)}.`,
      evidence: {
        statedGrandTotal,
        calculatedGrandTotal,
        discrepancy,
        direction: isOvercharge ? 'OVERCHARGE' : 'UNDERCHARGE',
      },
      suggestedAction:
        'Halt payment processing until the vendor clarifies the unexplained discrepancy.',
    });
  }

  // Subtotal mismatch
  if (Math.abs(invoice.subtotal - calculatedSubtotal) > 1.0) {
    findings.push({
      id: 'math-subtotal-mismatch',
      ruleId: 'RULE-MATH-04',
      ruleName: 'Invoice Subtotal Inconsistency',
      category: 'TAX_MATH',
      severity: 'LOW',
      penaltyPoints: 10,
      message: `Stated subtotal of ₹${invoice.subtotal.toFixed(2)} does not match sum of individual line items (₹${calculatedSubtotal.toFixed(2)}).`,
      evidence: {
        statedSubtotal: invoice.subtotal,
        calculatedSubtotal,
      },
      suggestedAction: 'Request corrected invoice header from supplier.',
    });
  }

  return {
    findings,
    reconciliation: {
      calculatedSubtotal,
      statedSubtotal: invoice.subtotal,
      calculatedTax,
      statedTax: invoice.totalTax,
      calculatedGrandTotal,
      statedGrandTotal,
      discrepancy,
      isBalanced: discrepancy <= 1.0,
    },
  };
}

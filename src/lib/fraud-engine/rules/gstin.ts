import { FraudFinding, InvoicePayload } from '../types';
import { validateGSTIN, determineSupplyType } from '../../gst';

/**
 * Validates GSTIN compliance, checksum integrity, and Inter vs Intra-state tax allocation.
 */
export function checkGstinCompliance(invoice: InvoicePayload): FraudFinding[] {
  const findings: FraudFinding[] = [];

  // 1. Supplier GSTIN Validation
  const supplierResult = validateGSTIN(invoice.supplierGstin);
  if (!supplierResult.isValid) {
    findings.push({
      id: 'gstin-supplier-invalid',
      ruleId: 'RULE-GST-01',
      ruleName: 'Invalid Supplier GSTIN Detected',
      category: 'GSTIN',
      severity: 'CRITICAL',
      penaltyPoints: 40,
      message: `Supplier GSTIN "${invoice.supplierGstin}" failed tax validation: ${supplierResult.errors.join(' ')}`,
      evidence: {
        providedGstin: invoice.supplierGstin,
        expectedChecksum: supplierResult.calculatedChecksum || 'N/A',
        errors: supplierResult.errors.join('; '),
      },
      suggestedAction:
        'Verify vendor on the official GST portal (services.gst.gov.in) before processing payment to avoid loss of Input Tax Credit (ITC).',
    });
  }

  // 2. Buyer GSTIN Validation (if provided)
  if (invoice.buyerGstin) {
    const buyerResult = validateGSTIN(invoice.buyerGstin);
    if (!buyerResult.isValid) {
      findings.push({
        id: 'gstin-buyer-invalid',
        ruleId: 'RULE-GST-02',
        ruleName: 'Invalid Buyer GSTIN',
        category: 'GSTIN',
        severity: 'MEDIUM',
        penaltyPoints: 15,
        message: `Recipient/Buyer GSTIN "${invoice.buyerGstin}" has formatting issues: ${buyerResult.errors.join(' ')}`,
        evidence: {
          providedBuyerGstin: invoice.buyerGstin,
          errors: buyerResult.errors.join('; '),
        },
        suggestedAction:
          'Ensure the correct company entity GSTIN is specified for eligible ITC claim.',
      });
    }
  }

  // 3. Inter-State vs Intra-State Supply Rule Compliance
  if (invoice.supplierGstin && invoice.buyerGstin) {
    const expectedSupplyType = determineSupplyType(invoice.supplierGstin, invoice.buyerGstin);
    const supplierState = invoice.supplierGstin.trim().substring(0, 2);
    const buyerState = invoice.buyerGstin.trim().substring(0, 2);

    const cgstTotal = invoice.cgstTotal || 0;
    const sgstTotal = invoice.sgstTotal || 0;
    const igstTotal = invoice.igstTotal || 0;

    if (expectedSupplyType === 'INTRA_STATE') {
      // Intra-state: Both in same state. Must charge CGST + SGST. IGST is invalid.
      if (igstTotal > 0.05) {
        findings.push({
          id: 'gst-tax-type-mismatch-intra',
          ruleId: 'RULE-GST-03',
          ruleName: 'Illegal IGST on Intra-State Supply',
          category: 'GSTIN',
          severity: 'HIGH',
          penaltyPoints: 30,
          message: `Supplier (State ${supplierState}) and Buyer (State ${buyerState}) are within the same state, but IGST of ₹${igstTotal.toFixed(2)} was charged instead of CGST and SGST.`,
          evidence: {
            supplierState,
            buyerState,
            expectedSupplyType: 'INTRA_STATE',
            cgstBilled: cgstTotal,
            sgstBilled: sgstTotal,
            igstBilled: igstTotal,
          },
          suggestedAction:
            'Reject invoice and request revised credit note/invoice with equal CGST and SGST allocation to prevent tax penalty.',
        });
      }

      // CGST and SGST must be equal
      if (Math.abs(cgstTotal - sgstTotal) > 0.5) {
        findings.push({
          id: 'gst-asymmetric-split',
          ruleId: 'RULE-GST-04',
          ruleName: 'Asymmetric CGST and SGST Split',
          category: 'GSTIN',
          severity: 'MEDIUM',
          penaltyPoints: 20,
          message: `Intra-state GST requires exactly equal CGST and SGST amounts. Billed CGST: ₹${cgstTotal.toFixed(2)}, SGST: ₹${sgstTotal.toFixed(2)}.`,
          evidence: {
            cgstTotal,
            sgstTotal,
            discrepancy: Math.abs(cgstTotal - sgstTotal),
          },
          suggestedAction:
            'Request vendor to correct invoice tax schedule to conform with Indian GST laws.',
        });
      }
    } else {
      // Inter-state: Supplier and Buyer in different states. Must charge IGST. CGST/SGST invalid.
      if (cgstTotal > 0.05 || sgstTotal > 0.05) {
        findings.push({
          id: 'gst-tax-type-mismatch-inter',
          ruleId: 'RULE-GST-05',
          ruleName: 'Illegal CGST/SGST on Inter-State Supply',
          category: 'GSTIN',
          severity: 'HIGH',
          penaltyPoints: 30,
          message: `Supplier (State ${supplierState}) and Buyer (State ${buyerState}) are in different states, but CGST (₹${cgstTotal.toFixed(2)}) / SGST (₹${sgstTotal.toFixed(2)}) was charged instead of IGST.`,
          evidence: {
            supplierState,
            buyerState,
            expectedSupplyType: 'INTER_STATE',
            cgstBilled: cgstTotal,
            sgstBilled: sgstTotal,
            igstBilled: igstTotal,
          },
          suggestedAction:
            'Return invoice for revision. Charging local tax on interstate supplies makes Input Tax Credit non-claimable.',
        });
      }
    }
  }

  return findings;
}

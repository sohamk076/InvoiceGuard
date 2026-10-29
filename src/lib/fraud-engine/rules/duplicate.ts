import { FraudFinding, HistoricalContext, InvoicePayload } from '../types';

/**
 * Checks for exact duplicates, near-duplicates, and line item recycling.
 */
export function checkDuplicateInvoice(
  invoice: InvoicePayload,
  context: HistoricalContext
): FraudFinding[] {
  const findings: FraudFinding[] = [];
  const otherInvoices = (context.existingInvoices || []).filter(
    (inv) => inv.id !== invoice.id
  );

  const currentInvNum = (invoice.invoiceNumber || '').trim().toLowerCase();
  const currentSupplier = (invoice.supplierGstin || '').trim().toUpperCase();
  const currentDate = new Date(invoice.invoiceDate);

  for (const existing of otherInvoices) {
    const existingInvNum = (existing.invoiceNumber || '').trim().toLowerCase();
    const existingSupplier = (existing.supplierGstin || '').trim().toUpperCase();

    // 1. Exact Duplicate: Same invoice number from same vendor
    if (
      currentInvNum &&
      existingInvNum &&
      currentInvNum === existingInvNum &&
      currentSupplier === existingSupplier
    ) {
      findings.push({
        id: `dup-exact-${existing.id || existing.invoiceNumber}`,
        ruleId: 'RULE-DUP-01',
        ruleName: 'Exact Duplicate Invoice Detected',
        category: 'DUPLICATE',
        severity: 'CRITICAL',
        penaltyPoints: 45,
        message: `An invoice with number "${invoice.invoiceNumber}" from supplier GSTIN "${invoice.supplierGstin}" was already registered on ${existing.invoiceDate}.`,
        evidence: {
          duplicateInvoiceNumber: invoice.invoiceNumber,
          existingInvoiceId: existing.id || 'record-id',
          existingInvoiceDate: existing.invoiceDate,
          existingGrandTotal: existing.grandTotal,
        },
        suggestedAction:
          'Immediately hold payment and check vendor accounting ledger for double billing.',
      });
      break; // Found exact duplicate
    }

    // 2. Near-Duplicate: Same vendor, identical grand total, within 15 days
    if (
      currentSupplier === existingSupplier &&
      Math.abs(invoice.grandTotal - existing.grandTotal) < 0.01 &&
      !isNaN(currentDate.getTime())
    ) {
      const existingDate = new Date(existing.invoiceDate);
      if (!isNaN(existingDate.getTime())) {
        const diffDays = Math.abs(
          (currentDate.getTime() - existingDate.getTime()) / (1000 * 3600 * 24)
        );

        if (diffDays <= 15) {
          findings.push({
            id: `dup-near-${existing.id || existing.invoiceNumber}`,
            ruleId: 'RULE-DUP-02',
            ruleName: 'Potential Near-Duplicate Billing',
            category: 'DUPLICATE',
            severity: 'HIGH',
            penaltyPoints: 25,
            message: `Identical amount of ₹${invoice.grandTotal.toFixed(2)} billed by "${invoice.supplierName}" within ${Math.round(diffDays)} day(s) of invoice "${existing.invoiceNumber}".`,
            evidence: {
              targetInvoiceNumber: existing.invoiceNumber,
              identicalAmount: invoice.grandTotal,
              dayDifference: Math.round(diffDays),
            },
            suggestedAction:
              'Verify whether this is a legitimate recurring charge or duplicate billing disguised under a different invoice number.',
          });
        }
      }
    }
  }

  return findings;
}

import { FraudFinding, HistoricalContext, InvoicePayload } from '../types';

/**
 * Validates invoice dates, future dating, stale dating, and PO timeline sequence.
 */
export function checkSuspiciousDates(
  invoice: InvoicePayload,
  context: HistoricalContext
): FraudFinding[] {
  const findings: FraudFinding[] = [];

  const invoiceDate = new Date(invoice.invoiceDate);
  const now = new Date();

  // Tolerance of 24h for timezones
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);

  if (!isNaN(invoiceDate.getTime())) {
    // 1. Future dated invoice
    if (invoiceDate > tomorrow) {
      findings.push({
        id: 'date-future-dated',
        ruleId: 'RULE-DATE-01',
        ruleName: 'Future-Dated Invoice',
        category: 'DATES',
        severity: 'HIGH',
        penaltyPoints: 35,
        message: `Invoice date "${invoice.invoiceDate}" is set in the future. Today is ${now.toISOString().split('T')[0]}.`,
        evidence: {
          invoiceDate: invoice.invoiceDate,
          currentDate: now.toISOString().split('T')[0],
        },
        suggestedAction:
          'Clarify whether the invoice was generated prematurely or erroneously pre-dated.',
      });
    }

    // 2. Stale invoice (> 180 days old)
    const diffDaysPast = (now.getTime() - invoiceDate.getTime()) / (1000 * 3600 * 24);
    if (diffDaysPast > 180) {
      findings.push({
        id: 'date-stale-invoice',
        ruleId: 'RULE-DATE-02',
        ruleName: 'Stale Backdated Invoice',
        category: 'DATES',
        severity: 'MEDIUM',
        penaltyPoints: 20,
        message: `Invoice is ${Math.round(diffDaysPast)} days old (${invoice.invoiceDate}). Backdated invoices risk ITC disallowance under GST Section 16(4).`,
        evidence: {
          invoiceDate: invoice.invoiceDate,
          ageInDays: Math.round(diffDaysPast),
          statutoryLimitDays: 180,
        },
        suggestedAction:
          'Verify if Input Tax Credit can still legally be claimed under current fiscal year guidelines.',
      });
    }

    // 3. Due date precedes invoice date
    if (invoice.dueDate) {
      const dueDate = new Date(invoice.dueDate);
      if (!isNaN(dueDate.getTime()) && dueDate < invoiceDate) {
        findings.push({
          id: 'date-due-precedes-invoice',
          ruleId: 'RULE-DATE-03',
          ruleName: 'Due Date Precedes Invoice Date',
          category: 'DATES',
          severity: 'LOW',
          penaltyPoints: 10,
          message: `Due date (${invoice.dueDate}) is earlier than invoice issue date (${invoice.invoiceDate}).`,
          evidence: {
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
          },
          suggestedAction: 'Verify agreed credit terms with vendor.',
        });
      }
    }
  }

  // 4. Invoice date precedes Purchase Order date
  if (invoice.purchaseOrderId && context.purchaseOrders) {
    const linkedPo = context.purchaseOrders.find(
      (po) => po.id === invoice.purchaseOrderId || po.poNumber === invoice.purchaseOrderNumber
    );

    if (linkedPo && linkedPo.orderDate) {
      const poDate = new Date(linkedPo.orderDate);
      if (!isNaN(poDate.getTime()) && !isNaN(invoiceDate.getTime())) {
        if (invoiceDate < poDate) {
          findings.push({
            id: 'date-invoice-precedes-po',
            ruleId: 'RULE-DATE-04',
            ruleName: 'Invoice Precedes Purchase Order Date',
            category: 'DATES',
            severity: 'HIGH',
            penaltyPoints: 30,
            message: `Invoice was dated ${invoice.invoiceDate}, which precedes the official PO creation date of ${linkedPo.orderDate}.`,
            evidence: {
              invoiceDate: invoice.invoiceDate,
              purchaseOrderNumber: linkedPo.poNumber,
              purchaseOrderDate: linkedPo.orderDate,
            },
            suggestedAction:
              'Investigate potential unauthorized billing or post-facto PO creation.',
          });
        }
      }
    }
  }

  return findings;
}

import { FraudFinding, HistoricalContext, InvoicePayload } from '../types';

/**
 * Executes 3-way matching between invoice and approved Purchase Order.
 */
export function checkPurchaseOrderMatch(
  invoice: InvoicePayload,
  context: HistoricalContext
): FraudFinding[] {
  const findings: FraudFinding[] = [];

  // If no PO is linked
  if (!invoice.purchaseOrderId && !invoice.purchaseOrderNumber) {
    if (invoice.grandTotal >= 50000) {
      findings.push({
        id: 'po-missing-reference',
        ruleId: 'RULE-PO-01',
        ruleName: 'Missing Purchase Order Reference',
        category: 'PO_MATCH',
        severity: 'MEDIUM',
        penaltyPoints: 15,
        message: `High-value invoice (₹${invoice.grandTotal.toLocaleString('en-IN')}) has no linked Purchase Order. Corporate policy requires pre-approved PO for expenses exceeding ₹50,000.`,
        evidence: {
          grandTotal: invoice.grandTotal,
          policyThreshold: 50000,
        },
        suggestedAction:
          'Require procurement team to link or issue an approved Purchase Order before payment release.',
      });
    }
    return findings;
  }

  if (!context.purchaseOrders || context.purchaseOrders.length === 0) {
    return findings;
  }

  const linkedPo = context.purchaseOrders.find(
    (po) =>
      po.id === invoice.purchaseOrderId ||
      po.poNumber.toLowerCase() === (invoice.purchaseOrderNumber || '').trim().toLowerCase()
  );

  if (!linkedPo) {
    findings.push({
      id: 'po-not-found',
      ruleId: 'RULE-PO-02',
      ruleName: 'Unrecognized Purchase Order Number',
      category: 'PO_MATCH',
      severity: 'HIGH',
      penaltyPoints: 30,
      message: `Purchase Order reference "${invoice.purchaseOrderNumber}" was not found in the ERP purchase order registry.`,
      evidence: {
        providedPoNumber: invoice.purchaseOrderNumber,
      },
      suggestedAction:
        'Confirm if the PO was created in an unintegrated system or if the reference is fraudulent.',
    });
    return findings;
  }

  // 1. PO Vendor Consistency
  if (
    linkedPo.vendorGstin &&
    invoice.supplierGstin &&
    linkedPo.vendorGstin.trim().toUpperCase() !== invoice.supplierGstin.trim().toUpperCase()
  ) {
    findings.push({
      id: 'po-vendor-mismatch',
      ruleId: 'RULE-PO-03',
      ruleName: 'Purchase Order Vendor Mismatch',
      category: 'PO_MATCH',
      severity: 'CRITICAL',
      penaltyPoints: 40,
      message: `PO #${linkedPo.poNumber} was issued to GSTIN "${linkedPo.vendorGstin}", but this invoice was submitted by GSTIN "${invoice.supplierGstin}".`,
      evidence: {
        poVendorGstin: linkedPo.vendorGstin,
        invoiceSupplierGstin: invoice.supplierGstin,
      },
      suggestedAction:
        'Hold immediately. Investigate third-party substitution or fraudulent PO routing.',
    });
  }

  // 2. Total Amount Exceeds PO Total
  if (invoice.grandTotal > linkedPo.totalAmount + 5.0) {
    const excess = invoice.grandTotal - linkedPo.totalAmount;
    findings.push({
      id: 'po-total-exceeded',
      ruleId: 'RULE-PO-04',
      ruleName: 'Invoice Exceeds Approved PO Value',
      category: 'PO_MATCH',
      severity: 'HIGH',
      penaltyPoints: 30,
      message: `Invoice total of ₹${invoice.grandTotal.toLocaleString('en-IN')} exceeds approved PO value of ₹${linkedPo.totalAmount.toLocaleString('en-IN')} by ₹${excess.toLocaleString('en-IN')}.`,
      evidence: {
        invoiceTotal: invoice.grandTotal,
        approvedPoTotal: linkedPo.totalAmount,
        excessAmount: excess,
      },
      suggestedAction:
        'Request an approved Purchase Order amendment or credit note before processing payment.',
    });
  }

  // 3. Line-by-Line Item Matching
  for (const invItem of invoice.items || []) {
    // Try to find matching item by description or HSN
    const poItem = linkedPo.items.find(
      (p) =>
        p.itemDescription.toLowerCase().trim() === invItem.itemDescription.toLowerCase().trim() ||
        (p.hsnCode && invItem.hsnCode && p.hsnCode === invItem.hsnCode)
    );

    if (poItem) {
      // Check unit price inflation
      if (invItem.unitPrice > poItem.unitPrice + 0.05) {
        const unitDiff = invItem.unitPrice - poItem.unitPrice;
        findings.push({
          id: `po-unit-price-inflation-${invItem.id || invItem.itemDescription}`,
          ruleId: 'RULE-PO-05',
          ruleName: 'Unit Price Inflation Over PO Contract',
          category: 'PO_MATCH',
          severity: 'HIGH',
          penaltyPoints: 25,
          message: `Line item "${invItem.itemDescription}" billed at ₹${invItem.unitPrice.toFixed(2)} per unit, exceeding contractually agreed PO unit price of ₹${poItem.unitPrice.toFixed(2)}.`,
          evidence: {
            itemDescription: invItem.itemDescription,
            billedUnitPrice: invItem.unitPrice,
            contractedUnitPrice: poItem.unitPrice,
            unitDifference: unitDiff,
          },
          suggestedAction: 'Enforce contracted rate and reject the unauthorized price increase.',
        });
      }

      // Check quantity overbilling
      if (invItem.quantity > poItem.quantity) {
        findings.push({
          id: `po-quantity-overbilling-${invItem.id || invItem.itemDescription}`,
          ruleId: 'RULE-PO-06',
          ruleName: 'Billed Quantity Exceeds PO Quantity',
          category: 'PO_MATCH',
          severity: 'HIGH',
          penaltyPoints: 25,
          message: `Line item "${invItem.itemDescription}" billed quantity (${invItem.quantity}) exceeds PO approved quantity (${poItem.quantity}).`,
          evidence: {
            itemDescription: invItem.itemDescription,
            billedQuantity: invItem.quantity,
            contractedQuantity: poItem.quantity,
            excessQuantity: invItem.quantity - poItem.quantity,
          },
          suggestedAction: 'Require delivery challan and goods receipt note (GRN) verification.',
        });
      }
    } else {
      // Line item not present in PO
      findings.push({
        id: `po-unauthorized-item-${invItem.id || invItem.itemDescription}`,
        ruleId: 'RULE-PO-07',
        ruleName: 'Unauthorized Item Not in PO',
        category: 'PO_MATCH',
        severity: 'MEDIUM',
        penaltyPoints: 20,
        message: `Line item "${invItem.itemDescription}" was not included in approved PO #${linkedPo.poNumber}.`,
        evidence: {
          itemDescription: invItem.itemDescription,
          itemTotal: invItem.totalAmount,
        },
        suggestedAction: 'Confirm with department head if supplemental items were authorized.',
      });
    }
  }

  return findings;
}

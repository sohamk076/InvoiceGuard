// Deterministic Verification Script for InvoiceGuard Fraud Engine

import { validateGSTIN, calculateGstnChecksum, determineSupplyType, calculateGstTaxes } from '../src/lib/gst.js';
import { runFraudScan } from '../src/lib/fraud-engine/engine.js';

console.log('--- 1. TESTING GSTIN VALIDATION & LUHN MOD 36 CHECKSUM ---');

const validTataGstin = '27AAACT2727Q1ZW';
const calcChecksum = calculateGstnChecksum(validTataGstin.substring(0, 14));
console.log(`Tata Steel Checksum Test: Expected 'W', Calculated '${calcChecksum}' -> ${calcChecksum === 'W' ? 'PASS' : 'FAIL'}`);

const validCheck = validateGSTIN(validTataGstin);
console.log(`Valid GSTIN Full Validation: ${validCheck.isValid ? 'PASS' : 'FAIL'}`);

const corruptedGstin = '27AAACT2727Q1Z9';
const corruptCheck = validateGSTIN(corruptedGstin);
console.log(`Corrupted Checksum Detection: ${!corruptCheck.isValid && corruptCheck.errors.some(e => e.includes('Checksum failure')) ? 'PASS' : 'FAIL'}`);

const badStateGstin = '98AAACT2727Q1ZW';
const badStateCheck = validateGSTIN(badStateGstin);
console.log(`Invalid State Code Detection: ${!badStateCheck.isValid && badStateCheck.errors.some(e => e.includes('Invalid state code')) ? 'PASS' : 'FAIL'}`);

console.log('\n--- 2. TESTING INTER-STATE VS INTRA-STATE SUPPLY LOGIC ---');
const intraSupply = determineSupplyType('27AAACT2727Q1ZW', '27AABCE1234F1Z5');
console.log(`Intra-State Supply (27 -> 27): ${intraSupply === 'INTRA_STATE' ? 'PASS' : 'FAIL'}`);

const interSupply = determineSupplyType('27AAACT2727Q1ZW', '07AABCE1234F1Z9');
console.log(`Inter-State Supply (27 -> 07): ${interSupply === 'INTER_STATE' ? 'PASS' : 'FAIL'}`);

const intraTax = calculateGstTaxes(100000, 18, 'INTRA_STATE');
console.log(`Intra-State Tax Split: CGST=₹${intraTax.cgstAmount}, SGST=₹${intraTax.sgstAmount}, IGST=₹${intraTax.igstAmount} -> ${intraTax.cgstAmount === 9000 && intraTax.sgstAmount === 9000 && intraTax.igstAmount === 0 ? 'PASS' : 'FAIL'}`);

console.log('\n--- 3. TESTING DETERMINISTIC FRAUD ENGINE DETECTION ---');

const cleanInvoice = {
  id: 'inv-test-clean',
  invoiceNumber: 'INV-TEST-001',
  invoiceDate: '2026-10-15',
  supplierGstin: '27AAACT2727Q1ZW',
  supplierName: 'Tata Steel Industrial Solutions',
  buyerGstin: '27AABCE1234F1Z5',
  buyerName: 'Enterprise Finance Corp',
  purchaseOrderId: 'po-test-clean',
  purchaseOrderNumber: 'PO-2026-001',
  subtotal: 100000,
  totalTax: 18000,
  cgstTotal: 9000,
  sgstTotal: 9000,
  igstTotal: 0,
  grandTotal: 118000,
  items: [
    {
      itemDescription: 'Steel Plate 10mm',
      quantity: 10,
      unitPrice: 10000,
      taxableAmount: 100000,
      gstRate: 18,
      cgstAmount: 9000,
      sgstAmount: 9000,
      igstAmount: 0,
      totalAmount: 118000,
    }
  ]
};

const cleanScan = runFraudScan(cleanInvoice, {
  existingInvoices: [],
  purchaseOrders: [
    {
      id: 'po-test-clean',
      poNumber: 'PO-2026-001',
      vendorGstin: '27AAACT2727Q1ZW',
      orderDate: '2026-10-01',
      totalAmount: 118000,
      status: 'OPEN',
      items: [
        {
          itemDescription: 'Steel Plate 10mm',
          quantity: 10,
          unitPrice: 10000,
          totalAmount: 100000,
        }
      ]
    }
  ]
});
console.log(`Clean Invoice Risk Score: ${cleanScan.overallRiskScore}/100, Flags: ${cleanScan.totalFlags} -> ${cleanScan.overallRiskScore === 0 ? 'PASS' : 'FAIL'}`);

// Duplicate
const dupScan = runFraudScan(cleanInvoice, {
  existingInvoices: [
    {
      id: 'inv-existing-approved',
      invoiceNumber: 'INV-TEST-001',
      invoiceDate: '2026-09-30',
      supplierGstin: '27AAACT2727Q1ZW',
      grandTotal: 118000,
    }
  ]
});
console.log(`Duplicate Billing Risk Score: ${dupScan.overallRiskScore}/100, Detected: ${dupScan.findings.some(f => f.ruleId === 'RULE-DUP-01') ? 'PASS' : 'FAIL'}`);

// Math mismatch
const paddedInvoice = {
  ...cleanInvoice,
  id: 'inv-test-padded',
  invoiceNumber: 'INV-TEST-002',
  grandTotal: 125000,
};
const paddedScan = runFraudScan(paddedInvoice, { existingInvoices: [] });
console.log(`Arithmetic Discrepancy Detection: ${paddedScan.findings.some(f => f.ruleId === 'RULE-MATH-03') ? 'PASS' : 'FAIL'}`);

console.log('\n--- ALL VERIFICATION CHECKS COMPLETED ---');

import { parseInvoiceText } from '../src/lib/ocr/invoice-parser.js';

// Sample pharmacy invoice raw text
const sampleInvoiceText = `
TAX INVOICE
SHIVAM PHARMA
Wholesale Chemists & Druggists
Shop No. 12, Medicine Market, Delhi
GSTIN: 07AAACS1429B1Z2
D.L. No.: 20B-123456, 21B-654321
Phone: 9876543210

Invoice No: SP/2026/0892
Invoice Date: 15/01/2026
Due Date: 15/02/2026

Billed To:
M/S Khullar Medicos
Main Road, Sector 14, Gurugram, Haryana
GSTIN: 06AABCK9918M1ZQ
D.L. No.: 20B-998877

Sr  Description          HSN     Batch   Exp     Qty  Rate   GST%  Total
1   Amoxicillin 500mg    300410  BAT01   05/28   10   100.00 12%   1000.00
2   Paracetamol 650mg    300490  BAT02   08/27   20   49.78  12%   995.54

Taxable Amount: 1,995.54
Total Tax: 239.46
CGST: 119.73
SGST: 119.73
Grand Total: 2,235.00
`;

const result = parseInvoiceText(sampleInvoiceText);

console.log('--- PARSER EXTRACTION RESULT ---');
console.log('Supplier Name:', result.supplierName.value, `(${result.supplierName.confidence})`);
console.log('Supplier GSTIN:', result.supplierGstin.value, `(${result.supplierGstin.confidence})`);
console.log('Supplier DL:', result.supplierDrugLicense?.value);
console.log('Buyer Name:', result.buyerName.value, `(${result.buyerName.confidence})`);
console.log('Buyer GSTIN:', result.buyerGstin.value, `(${result.buyerGstin.confidence})`);
console.log('Buyer DL:', result.buyerDrugLicense?.value);
console.log('Invoice No:', result.invoiceNumber.value, `(${result.invoiceNumber.confidence})`);
console.log('Invoice Date:', result.invoiceDate.value, `(${result.invoiceDate.confidence})`);
console.log('Due Date:', result.dueDate?.value);
console.log('Subtotal:', result.subtotal.value);
console.log('Total Tax:', result.totalTax.value);
console.log('Grand Total:', result.grandTotal.value, `(${result.grandTotal.confidence})`);
console.log('Items Count:', result.items.length);

let passed = true;
if (!result.supplierName.value.toUpperCase().includes('SHIVAM PHARMA')) {
  console.error('FAIL: Supplier name mismatch:', result.supplierName.value);
  passed = false;
}
if (!result.buyerName.value.toUpperCase().includes('KHULLAR MEDICOS')) {
  console.error('FAIL: Buyer name mismatch:', result.buyerName.value);
  passed = false;
}
if (result.grandTotal.value !== 2235.00) {
  console.error('FAIL: Grand total mismatch:', result.grandTotal.value);
  passed = false;
}
if (result.supplierGstin.value !== '07AAACS1429B1Z2') {
  console.error('FAIL: Supplier GSTIN mismatch:', result.supplierGstin.value);
  passed = false;
}
if (result.buyerGstin.value !== '06AABCK9918M1ZQ') {
  console.error('FAIL: Buyer GSTIN mismatch:', result.buyerGstin.value);
  passed = false;
}

if (passed) {
  console.log('\nALL EXTRACTION ASSERTIONS PASSED SUCCESSFULLY!');
} else {
  process.exit(1);
}

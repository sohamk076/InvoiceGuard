// Invoice Text Parser for Indian Pharmaceutical & Commercial Invoices
import { validateGSTIN } from '../gst';

export type FieldConfidence = 'high' | 'medium' | 'uncertain';

export interface ExtractedField<T> {
  value: T;
  confidence: FieldConfidence;
  raw?: string;
}

export interface ExtractedLineItem {
  id: string;
  itemDescription: string;
  hsnCode?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxableAmount: number;
  gstRate: number; // percentage, e.g. 12 or 18
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount: number;
  confidence: FieldConfidence;
}

export interface ExtractedInvoice {
  rawText: string;
  supplierName: ExtractedField<string>;
  supplierGstin: ExtractedField<string>;
  supplierDrugLicense?: ExtractedField<string>;
  supplierAddress?: ExtractedField<string>;
  buyerName: ExtractedField<string>;
  buyerGstin: ExtractedField<string>;
  buyerDrugLicense?: ExtractedField<string>;
  buyerAddress?: ExtractedField<string>;
  invoiceNumber: ExtractedField<string>;
  invoiceDate: ExtractedField<string>; // YYYY-MM-DD
  dueDate?: ExtractedField<string>;
  purchaseOrderNumber?: ExtractedField<string>;
  subtotal: ExtractedField<number>;
  totalTax: ExtractedField<number>;
  cgstTotal?: ExtractedField<number>;
  sgstTotal?: ExtractedField<number>;
  igstTotal?: ExtractedField<number>;
  discountTotal?: ExtractedField<number>;
  grandTotal: ExtractedField<number>;
  currency: string;
  items: ExtractedLineItem[];
}

/**
 * Normalizes Indian currency strings (e.g. "2,235.00", "Rs. 2235", "₹ 2,235.50") into number.
 */
export function parseAmount(str: string | undefined | null): number | null {
  if (!str) return null;
  const cleaned = str
    .replace(/₹|Rs\.?|INR/gi, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

/**
 * Normalizes date string into YYYY-MM-DD format.
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    // Basic bounds check
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = cleaned.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    let month = parseInt(ymdMatch[2], 10);
    let day = parseInt(ymdMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try textual months like "15-Jan-2026" or "15 Jan 2026"
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const textMonthMatch = cleaned.match(/(\d{1,2})[\s\-\/]([A-Za-z]{3,9})[\s\-\/](\d{2,4})/);
  if (textMonthMatch) {
    const day = String(parseInt(textMonthMatch[1], 10)).padStart(2, '0');
    const mStr = textMonthMatch[2].substring(0, 3).toLowerCase();
    let year = parseInt(textMonthMatch[3], 10);
    if (year < 100) year += 2000;
    if (monthMap[mStr]) {
      return `${year}-${monthMap[mStr]}-${day}`;
    }
  }

  return null;
}

/**
 * Parses raw text extracted from invoice via OCR or PDF into structured fields.
 */
export function parseInvoiceText(
  rawText: string,
  userProfile?: { organizationName?: string; organizationGstin?: string }
): ExtractedInvoice {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // 1. Extract all GSTIN occurrences
  // GSTIN pattern: 2 digits + 5 alpha + 4 digits + 1 alpha + 1 alpha/digit + 'Z' + 1 alpha/digit
  const gstinRegex = /\b([0-3][0-9][A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1})\b/gi;
  const foundGstins: { gstin: string; lineIndex: number; line: string }[] = [];
  
  lines.forEach((line, index) => {
    let match;
    while ((match = gstinRegex.exec(line)) !== null) {
      const g = match[1].toUpperCase();
      if (!foundGstins.some(item => item.gstin === g)) {
        foundGstins.push({ gstin: g, lineIndex: index, line });
      }
    }
  });

  // Identify Supplier GSTIN vs Buyer GSTIN
  let supplierGstin = '';
  let supplierGstinConfidence: FieldConfidence = 'uncertain';
  let buyerGstin = '';
  let buyerGstinConfidence: FieldConfidence = 'uncertain';

  if (foundGstins.length === 1) {
    // If only one GSTIN found, check if it matches user's own GSTIN
    if (userProfile?.organizationGstin && foundGstins[0].gstin === userProfile.organizationGstin.toUpperCase()) {
      buyerGstin = foundGstins[0].gstin;
      buyerGstinConfidence = 'high';
    } else {
      supplierGstin = foundGstins[0].gstin;
      supplierGstinConfidence = validateGSTIN(supplierGstin).isValid ? 'high' : 'medium';
    }
  } else if (foundGstins.length >= 2) {
    // Search for buyer markers near GSTINs
    const buyerKeywords = /(buyer|bill\s*to|consignee|customer|party|recipient)/i;
    const supplierKeywords = /(seller|supplier|from|vendor|sold\s*by)/i;

    let buyerCandidate = foundGstins.find(g => buyerKeywords.test(g.line));
    let supplierCandidate = foundGstins.find(g => supplierKeywords.test(g.line));

    if (!buyerCandidate && userProfile?.organizationGstin) {
      buyerCandidate = foundGstins.find(g => g.gstin === userProfile.organizationGstin?.toUpperCase());
    }

    if (buyerCandidate && supplierCandidate && buyerCandidate.gstin !== supplierCandidate.gstin) {
      buyerGstin = buyerCandidate.gstin;
      buyerGstinConfidence = 'high';
      supplierGstin = supplierCandidate.gstin;
      supplierGstinConfidence = 'high';
    } else if (buyerCandidate) {
      buyerGstin = buyerCandidate.gstin;
      buyerGstinConfidence = 'high';
      const other = foundGstins.find(g => g.gstin !== buyerCandidate?.gstin);
      if (other) {
        supplierGstin = other.gstin;
        supplierGstinConfidence = 'medium';
      }
    } else {
      // By standard convention, the supplier GSTIN appears first (in header)
      supplierGstin = foundGstins[0].gstin;
      supplierGstinConfidence = validateGSTIN(supplierGstin).isValid ? 'high' : 'medium';
      buyerGstin = foundGstins[1].gstin;
      buyerGstinConfidence = validateGSTIN(buyerGstin).isValid ? 'high' : 'medium';
    }
  }

  // 2. Extract Drug License Numbers (DL No / D.L. 20B, 21B)
  let supplierDl = '';
  let buyerDl = '';
  const dlRegex = /(?:D\.?L\.?\s*(?:No\.?|Lic\.?|Number)?[:\s]*)([A-Z0-9\/\-\s,]{5,40})/gi;
  const dlMatches: string[] = [];
  lines.forEach(line => {
    let m;
    while ((m = dlRegex.exec(line)) !== null) {
      const cleaned = m[1].trim().replace(/(GSTIN|FSSAI|Date|Invoice).*/i, '').trim();
      if (cleaned.length >= 4 && !dlMatches.includes(cleaned)) {
        dlMatches.push(cleaned);
      }
    }
  });

  if (dlMatches.length > 0) supplierDl = dlMatches[0];
  if (dlMatches.length > 1) buyerDl = dlMatches[1];

  // 3. Extract Supplier Name & Buyer Name
  // Generic pharmaceutical / distributor suffixes
  const pharmaKeywords = /(pharma|pharmaceutical|distributor|chemist|druggist|laboratories|enterprises|medicos|healthcare|agency|agencies|medical\s*store|surgical)/i;
  const headerSkip = /(tax\s*invoice|original|duplicate|triplicate|cash\s*memo|credit\s*memo|retail\s*invoice|challan|bill\s*of\s*supply)/i;

  let supplierName = '';
  let supplierNameConfidence: FieldConfidence = 'uncertain';
  let buyerName = '';
  let buyerNameConfidence: FieldConfidence = 'uncertain';

  // Find Buyer Name from "Bill To", "Billed To", "M/s", "Buyer:", "Customer:", "Consignee:"
  const buyerPattern = /(?:billed\s*to|bill\s*to|buyer|consignee|customer|party|to\s*,\s*m\/s|m\/s\.?|to\s*:)[:\s]*([^\n\r]+)/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bMatch = line.match(buyerPattern);
    if (bMatch) {
      let candidate = bMatch[1].trim();
      // If the line only said "Bill to:" or "M/s:" without a name, check the next line
      if (candidate.length < 3 && i + 1 < lines.length) {
        candidate = lines[i + 1].trim();
      }
      // Clean candidate of subsequent labels
      candidate = candidate.replace(/(gstin|dl\s*no|address|phone|state).*/i, '').trim();
      if (candidate.length >= 3 && !headerSkip.test(candidate)) {
        buyerName = candidate;
        buyerNameConfidence = 'high';
        break;
      }
    }
  }

  // Find Supplier Name (typically in top 10 lines of invoice)
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const line = lines[i];
    if (headerSkip.test(line)) continue;
    if (line.match(buyerPattern)) continue;
    if (buyerName && line.includes(buyerName)) continue;
    if (line.match(/^(gstin|pan|dl\s*no|phone|email|fssai|cin|tax\s*invoice)/i)) continue;

    // Check if line contains company name indicator
    if (pharmaKeywords.test(line) || /(pvt\.?\s*ltd\.?|limited|enterprises|corporation)/i.test(line)) {
      // Clean leading prefixes like "From:" or "M/s"
      let candidate = line.replace(/^(from|sold\s*by|supplier|m\/s\.?)[:\s]*/i, '').trim();
      candidate = candidate.replace(/(gstin|dl\s*no|fssai).*/i, '').trim();
      if (candidate.length >= 3) {
        supplierName = candidate;
        supplierNameConfidence = 'high';
        break;
      }
    }
  }

  // Fallback for supplier name: first substantive non-header line near top
  if (!supplierName) {
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i];
      if (!headerSkip.test(line) && line.length >= 4 && !/^(gstin|date|invoice|bill)/i.test(line)) {
        supplierName = line.replace(/^(from|sold\s*by|supplier|m\/s\.?)[:\s]*/i, '').trim();
        supplierNameConfidence = 'medium';
        break;
      }
    }
  }

  // 4. Extract Invoice Number
  let invoiceNumber = '';
  let invoiceNumberConfidence: FieldConfidence = 'uncertain';
  const invNoRegex = /(?:invoice\s*(?:no\.?|number|#)|inv\.?\s*(?:no\.?|#)|bill\s*(?:no\.?|#)|doc\s*no\.?)[:\s]*([A-Z0-9\/\-_]+)/i;
  for (const line of lines) {
    const m = line.match(invNoRegex);
    if (m && m[1].length >= 2) {
      invoiceNumber = m[1].trim();
      invoiceNumberConfidence = 'high';
      break;
    }
  }

  // Fallback: look for lines with standalone alphanumeric code like "INV-2026-001" or "SP/26-27/104"
  if (!invoiceNumber) {
    const codeRegex = /\b([A-Z]{2,4}[\/-][0-9]{2,4}[\/-][0-9A-Z]+|[A-Z]+-[0-9]{3,})\b/;
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const m = lines[i].match(codeRegex);
      if (m && !m[1].includes('GST') && !m[1].includes('20B') && !m[1].includes('21B')) {
        invoiceNumber = m[1];
        invoiceNumberConfidence = 'medium';
        break;
      }
    }
  }

  // 5. Extract Invoice Date & Due Date
  let invoiceDate = '';
  let invoiceDateConfidence: FieldConfidence = 'uncertain';
  let dueDate = '';
  const dateRegex = /(?:invoice\s*date|inv\.?\s*date|dated|date)[:\s]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,2}|[0-9]{1,2}[\s\-\/][A-Za-z]{3,9}[\s\-\/][0-9]{2,4})/i;
  
  for (const line of lines) {
    const m = line.match(dateRegex);
    if (m) {
      const normalized = normalizeDate(m[1]);
      if (normalized) {
        invoiceDate = normalized;
        invoiceDateConfidence = 'high';
        break;
      }
    }
  }

  // Fallback for invoice date: find first valid date string in top half of document
  if (!invoiceDate) {
    const genericDateRegex = /\b([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})\b/;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const m = lines[i].match(genericDateRegex);
      if (m) {
        const normalized = normalizeDate(m[1]);
        if (normalized) {
          invoiceDate = normalized;
          invoiceDateConfidence = 'medium';
          break;
        }
      }
    }
  }

  const dueDateRegex = /(?:due\s*date|payment\s*due)[:\s]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i;
  for (const line of lines) {
    const m = line.match(dueDateRegex);
    if (m) {
      const norm = normalizeDate(m[1]);
      if (norm) dueDate = norm;
    }
  }

  // 6. Extract Purchase Order Number
  let poNumber = '';
  const poRegex = /(?:p\.?o\.?\s*(?:no\.?|number|ref|#)?|purchase\s*order\s*(?:no\.?|#)?|order\s*no\.?)[:\s]*([A-Z0-9\/\-_]+)/i;
  for (const line of lines) {
    const m = line.match(poRegex);
    if (m && m[1].length >= 3 && !/date/i.test(m[1])) {
      poNumber = m[1].trim();
      break;
    }
  }

  // 7. Extract Totals & Taxes
  let grandTotal = 0;
  let grandTotalConfidence: FieldConfidence = 'uncertain';
  let subtotal = 0;
  let subtotalConfidence: FieldConfidence = 'uncertain';
  let totalTax = 0;
  let totalTaxConfidence: FieldConfidence = 'uncertain';
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  // Patterns for Grand Total
  // E.g.: "Grand Total: 2,235.00", "Net Amount: ₹2,235.00", "Total: 2,235.00", "Total Rs. 2,235.00"
  const grandTotalPatterns = [
    /(?:grand\s*total|net\s*payable|net\s*amount|total\s*invoice\s*value|total\s*amount|invoice\s*total|final\s*amount|total\s*rs\.?|total\s*₹)[:\s]*([₹Rs\.\s]*[0-9,]+\.[0-9]{2})/i,
    /(?:grand\s*total|net\s*payable|net\s*amount|total)[:\s]*([0-9,]+)/i
  ];

  for (const pattern of grandTotalPatterns) {
    for (const line of lines) {
      const m = line.match(pattern);
      if (m) {
        const amt = parseAmount(m[1]);
        if (amt !== null && amt > 0) {
          grandTotal = amt;
          grandTotalConfidence = 'high';
          break;
        }
      }
    }
    if (grandTotal > 0) break;
  }

  // Subtotal / Taxable Amount
  const subtotalRegex = /(?:sub\s*total|taxable\s*value|taxable\s*amt|taxable\s*amount|total\s*before\s*tax)[:\s]*([₹Rs\.\s]*[0-9,]+\.[0-9]{2})/i;
  for (const line of lines) {
    const m = line.match(subtotalRegex);
    if (m) {
      const amt = parseAmount(m[1]);
      if (amt !== null && amt > 0) {
        subtotal = amt;
        subtotalConfidence = 'high';
        break;
      }
    }
  }

  // Taxes breakdown
  const cgstRegex = /(?:cgst|central\s*tax)(?:\s*amount)?[:\s]*([₹Rs\.\s]*[0-9,]+\.[0-9]{2})/i;
  const sgstRegex = /(?:sgst|state\s*tax)(?:\s*amount)?[:\s]*([₹Rs\.\s]*[0-9,]+\.[0-9]{2})/i;
  const igstRegex = /(?:igst|integrated\s*tax)(?:\s*amount)?[:\s]*([₹Rs\.\s]*[0-9,]+\.[0-9]{2})/i;
  const totalTaxRegex = /(?:total\s*tax|total\s*gst|tax\s*amount)[:\s]*([₹Rs\.\s]*[0-9,]+\.[0-9]{2})/i;

  for (const line of lines) {
    if (!cgstTotal) {
      const m = line.match(cgstRegex);
      if (m) cgstTotal = parseAmount(m[1]) || 0;
    }
    if (!sgstTotal) {
      const m = line.match(sgstRegex);
      if (m) sgstTotal = parseAmount(m[1]) || 0;
    }
    if (!igstTotal) {
      const m = line.match(igstRegex);
      if (m) igstTotal = parseAmount(m[1]) || 0;
    }
    if (!totalTax) {
      const m = line.match(totalTaxRegex);
      if (m) {
        totalTax = parseAmount(m[1]) || 0;
        totalTaxConfidence = 'high';
      }
    }
  }

  if (!totalTax && (cgstTotal > 0 || sgstTotal > 0 || igstTotal > 0)) {
    totalTax = Math.round((cgstTotal + sgstTotal + igstTotal) * 100) / 100;
    totalTaxConfidence = 'high';
  }

  // 8. Extract Line Items
  // Pharmacy invoices list items like:
  // "1 | PARACETAMOL 650MG | 300490 | BATCH101 | 05/27 | 10 | 120.00 | 12% | 1200.00"
  // or tab/pipe/multi-space separated
  const items: ExtractedLineItem[] = [];

  // Table row heuristic: lines that have medicine names and multiple numbers (quantity, rate, total)
  const itemLineRegex = /^([A-Z0-9\s\.\-_&]+?)\s+(\d{4,8})?\s*([A-Z0-9\-]+)?\s*(\d{1,2}[\/\-]\d{2,4})?\s+(\d+)\s+([0-9\.]+)\s+([0-9\.]+)%?\s+([0-9\.,]+)$/i;
  
  lines.forEach((line, index) => {
    // Skip obvious header or footer lines
    if (headerSkip.test(line) || /^(sub\s*total|grand\s*total|cgst|sgst|igst|terms|for\s+|bank)/i.test(line)) {
      return;
    }

    const match = line.match(itemLineRegex);
    if (match) {
      const desc = match[1].trim();
      const hsn = match[2]?.trim();
      const batch = match[3]?.trim();
      const expiry = match[4]?.trim();
      const qty = parseInt(match[5], 10) || 1;
      const rate = parseFloat(match[6]) || 0;
      const gstRate = parseFloat(match[7]) || 12;
      const lineTotal = parseAmount(match[8]) || (qty * rate);

      const taxable = Math.round((qty * rate) * 100) / 100;
      const taxAmt = Math.round((taxable * (gstRate / 100)) * 100) / 100;

      items.push({
        id: `item-${index + 1}`,
        itemDescription: desc,
        hsnCode: hsn,
        batchNumber: batch,
        expiryDate: expiry,
        quantity: qty,
        unitPrice: rate,
        taxableAmount: taxable,
        gstRate,
        cgstAmount: Math.round((taxAmt / 2) * 100) / 100,
        sgstAmount: Math.round((taxAmt / 2) * 100) / 100,
        totalAmount: lineTotal,
        confidence: 'medium',
      });
    }
  });

  // If no detailed table rows were cleanly separated by regex, check if we have grand total and subtotal.
  // If subtotal is missing, back-calculate from grand total assuming standard 12% GST
  if (grandTotal > 0 && subtotal === 0) {
    if (totalTax > 0 && grandTotal > totalTax) {
      subtotal = Math.round((grandTotal - totalTax) * 100) / 100;
      subtotalConfidence = 'medium';
    } else {
      // standard pharma rate is 12%
      subtotal = Math.round((grandTotal / 1.12) * 100) / 100;
      totalTax = Math.round((grandTotal - subtotal) * 100) / 100;
      cgstTotal = Math.round((totalTax / 2) * 100) / 100;
      sgstTotal = Math.round((totalTax / 2) * 100) / 100;
      subtotalConfidence = 'uncertain';
      totalTaxConfidence = 'uncertain';
    }
  }

  // If items array is still empty but we have an invoice total, generate a candidate line item
  // for the user to review, edit, or split in the review modal!
  if (items.length === 0 && (grandTotal > 0 || subtotal > 0)) {
    const itemSubtotal = subtotal > 0 ? subtotal : grandTotal;
    const itemGst = totalTax > 0 && subtotal > 0 
      ? Math.round(((totalTax / subtotal) * 100) * 10) / 10 
      : 12;

    items.push({
      id: 'item-1',
      itemDescription: 'Pharmaceutical Supplies (Verify & edit details)',
      quantity: 1,
      unitPrice: itemSubtotal,
      taxableAmount: itemSubtotal,
      gstRate: itemGst,
      cgstAmount: cgstTotal || Math.round(((itemSubtotal * (itemGst / 200))) * 100) / 100,
      sgstAmount: sgstTotal || Math.round(((itemSubtotal * (itemGst / 200))) * 100) / 100,
      totalAmount: grandTotal > 0 ? grandTotal : itemSubtotal + totalTax,
      confidence: 'uncertain',
    });
  }

  return {
    rawText,
    supplierName: {
      value: supplierName || 'Unidentified Supplier',
      confidence: supplierNameConfidence,
    },
    supplierGstin: {
      value: supplierGstin || '',
      confidence: supplierGstinConfidence,
    },
    supplierDrugLicense: supplierDl ? { value: supplierDl, confidence: 'medium' } : undefined,
    buyerName: {
      value: buyerName || (userProfile?.organizationName || 'Customer / Billed Party'),
      confidence: buyerNameConfidence,
    },
    buyerGstin: {
      value: buyerGstin || (userProfile?.organizationGstin || ''),
      confidence: buyerGstinConfidence,
    },
    buyerDrugLicense: buyerDl ? { value: buyerDl, confidence: 'medium' } : undefined,
    invoiceNumber: {
      value: invoiceNumber || '',
      confidence: invoiceNumberConfidence,
    },
    invoiceDate: {
      value: invoiceDate || new Date().toISOString().slice(0, 10),
      confidence: invoiceDateConfidence,
    },
    dueDate: dueDate ? { value: dueDate, confidence: 'medium' } : undefined,
    purchaseOrderNumber: poNumber ? { value: poNumber, confidence: 'medium' } : undefined,
    subtotal: {
      value: subtotal,
      confidence: subtotalConfidence,
    },
    totalTax: {
      value: totalTax,
      confidence: totalTaxConfidence,
    },
    cgstTotal: cgstTotal > 0 ? { value: cgstTotal, confidence: 'medium' } : undefined,
    sgstTotal: sgstTotal > 0 ? { value: sgstTotal, confidence: 'medium' } : undefined,
    igstTotal: igstTotal > 0 ? { value: igstTotal, confidence: 'medium' } : undefined,
    grandTotal: {
      value: grandTotal,
      confidence: grandTotalConfidence,
    },
    currency: 'INR',
    items,
  };
}

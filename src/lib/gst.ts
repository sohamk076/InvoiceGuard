// Indian Goods and Services Tax (GST) Utilities and Validation Engine

export interface GSTState {
  code: string;
  name: string;
}

export const INDIAN_GST_STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

const GSTN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Calculates the GSTN checksum for a 14-character GSTIN prefix using the Luhn mod 36 algorithm.
 */
export function calculateGstnChecksum(first14: string): string {
  const upper = first14.toUpperCase();
  let sum = 0;

  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    const val = GSTN_CHARS.indexOf(char);
    if (val === -1) return '';

    // Alternating factor: 1 for even index, 2 for odd index
    const factor = (i % 2 === 0) ? 1 : 2;
    const product = val * factor;
    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    sum += quotient + remainder;
  }

  const remainder = sum % 36;
  const checkCode = (36 - remainder) % 36;
  return GSTN_CHARS[checkCode];
}

export interface GSTINValidationResult {
  isValid: boolean;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  entityNumber?: string;
  checksum?: string;
  calculatedChecksum?: string;
  errors: string[];
}

/**
 * Validates an Indian GSTIN format, state code, PAN structure, and checksum.
 */
export function validateGSTIN(gstin: string): GSTINValidationResult {
  const errors: string[] = [];
  const clean = (gstin || '').trim().toUpperCase();

  if (!clean) {
    return { isValid: false, errors: ['GSTIN is required.'] };
  }

  if (clean.length !== 15) {
    errors.push(`GSTIN must be exactly 15 characters (provided ${clean.length}).`);
  }

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(clean)) {
    errors.push('GSTIN does not match standard Indian tax format (2 state digits + 10 PAN chars + entity code + Z + checksum).');
  }

  const stateCode = clean.substring(0, 2);
  const stateName = INDIAN_GST_STATES[stateCode];
  if (!stateName) {
    errors.push(`Invalid state code "${stateCode}". Must be a valid Indian state or Union Territory code (01-38, 97, 99).`);
  }

  const pan = clean.substring(2, 12);
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(pan)) {
    errors.push(`Embedded PAN "${pan}" is invalid.`);
  } else {
    // 4th character of PAN denotes entity type:
    // C = Company, P = Person, H = HUF, F = Firm/LLP, A = AOP, T = Trust, B = BOI, L = Local Authority, J = Artificial Juridical Person, G = Government
    const entityTypeChar = pan[3];
    const validEntityTypes = ['C', 'P', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G'];
    if (!validEntityTypes.includes(entityTypeChar)) {
      errors.push(`Embedded PAN entity type indicator "${entityTypeChar}" is unrecognized.`);
    }
  }

  const entityNumber = clean.substring(12, 13);
  const defaultZ = clean.substring(13, 14);
  if (defaultZ !== 'Z') {
    errors.push(`Character 14 must be default 'Z' according to GST rules.`);
  }

  const actualChecksum = clean.substring(14, 15);
  let calculatedChecksum = '';
  if (clean.length === 15) {
    calculatedChecksum = calculateGstnChecksum(clean.substring(0, 14));
    if (actualChecksum !== calculatedChecksum) {
      errors.push(`Checksum failure: expected "${calculatedChecksum}", but found "${actualChecksum}".`);
    }
  }

  return {
    isValid: errors.length === 0,
    stateCode,
    stateName,
    pan,
    entityNumber,
    checksum: actualChecksum,
    calculatedChecksum,
    errors,
  };
}

export type SupplyType = 'INTRA_STATE' | 'INTER_STATE';

/**
 * Determines whether a supply is Intra-State (CGST + SGST) or Inter-State (IGST)
 */
export function determineSupplyType(supplierGstin: string, buyerGstin: string): SupplyType {
  const supplierState = (supplierGstin || '').trim().substring(0, 2);
  const buyerState = (buyerGstin || '').trim().substring(0, 2);

  if (supplierState && buyerState && supplierState === buyerState) {
    return 'INTRA_STATE';
  }
  return 'INTER_STATE';
}

export interface TaxSplit {
  taxableAmount: number;
  rate: number; // e.g. 18 for 18%
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

/**
 * Calculates correct GST tax breakdown based on supply type and taxable amount.
 */
export function calculateGstTaxes(
  taxableAmount: number,
  rate: number,
  supplyType: SupplyType
): TaxSplit {
  const totalTax = Math.round((taxableAmount * (rate / 100)) * 100) / 100;

  if (supplyType === 'INTRA_STATE') {
    const halfRate = rate / 2;
    const halfTax = Math.round((totalTax / 2) * 100) / 100;
    return {
      taxableAmount,
      rate,
      cgstRate: halfRate,
      cgstAmount: halfTax,
      sgstRate: halfRate,
      sgstAmount: halfTax,
      igstRate: 0,
      igstAmount: 0,
      totalTax,
      totalAmount: Math.round((taxableAmount + totalTax) * 100) / 100,
    };
  } else {
    return {
      taxableAmount,
      rate,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: rate,
      igstAmount: totalTax,
      totalTax,
      totalAmount: Math.round((taxableAmount + totalTax) * 100) / 100,
    };
  }
}

/**
 * Decimal-safe arithmetic helpers to prevent IEEE-754 floating point issues.
 */
export function safeRound(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function safeAdd(a: number, b: number): number {
  return safeRound(a + b);
}

export function safeSub(a: number, b: number): number {
  return safeRound(a - b);
}

export function safeMul(a: number, b: number): number {
  return safeRound(a * b);
}

export function isWithinRoundingTolerance(
  val1: number,
  val2: number,
  tolerance: number = 1.0
): boolean {
  return Math.abs(safeSub(val1, val2)) <= tolerance;
}

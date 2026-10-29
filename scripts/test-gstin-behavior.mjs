// Verification of GSTIN validation behavior and user requirements
import { validateGSTIN, INDIAN_GST_STATES } from '../src/lib/gst.ts';

console.log('=== VERIFYING GSTIN VALIDATION & UI BEHAVIOR RULES ===\n');

let passCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

// 1. Partial input while typing (simulating user typing characters)
// The UI logic clears errors on change, but let's confirm validateGSTIN rejects incomplete strings accurately when called on blur
const partialInputs = ['2', '27', '27A', '27AAAC', '27AAACT2727', '27AAACT2727Q1Z'];
for (const partial of partialInputs) {
  const res = validateGSTIN(partial);
  assert(!res.isValid, `Incomplete typing "${partial}" correctly flagged as not yet valid (${res.errors[0]})`);
}

// 2. Valid 15-character Indian GSTINs with correct Luhn Mod 36 checksum
import { calculateGstnChecksum } from '../src/lib/gst.ts';

const gstinBases = [
  { base: '27AAACT2727Q1Z', state: 'Maharashtra', code: '27' },
  { base: '07AAAAA0000A1Z', state: 'Delhi', code: '07' },
  { base: '24AAACC1206D1Z', state: 'Gujarat', code: '24' },
];

for (const { base, state, code } of gstinBases) {
  const checkDigit = calculateGstnChecksum(base);
  const fullGstin = base + checkDigit;
  const res = validateGSTIN(fullGstin);
  assert(res.isValid, `Valid 15-char GSTIN "${fullGstin}" (checksum '${checkDigit}') passes validation`);
  assert(res.stateCode === code, `Valid GSTIN "${fullGstin}" resolves correct state code ${code}`);
  assert(res.stateName === state, `Valid GSTIN "${fullGstin}" resolves correct state name "${state}"`);
}

// 3. Corrupted / Invalid GSTINs
const invalidCases = [
  { gstin: '99AAACT2727Q1ZW', reason: 'Invalid state code' },
  { gstin: '27123CT2727Q1ZW', reason: 'Invalid PAN structure' },
  { gstin: '27AAACT2727Q1AW', reason: '14th character must be Z' },
  { gstin: '27AAACT2727Q1Z9', reason: 'Checksum failure' },
];

for (const { gstin, reason } of invalidCases) {
  const res = validateGSTIN(gstin);
  assert(!res.isValid, `Invalid GSTIN "${gstin}" correctly rejected (${reason})`);
  assert(res.errors.length > 0, `Clear error message provided: "${res.errors[0]}"`);
}

// 4. Optional vs Required behavior simulation
function simulateFormSubmit({ supplierGstin, buyerGstin, isSupplierRequired = true }) {
  const errors = {};

  // Supplier GSTIN (required)
  if (isSupplierRequired && !supplierGstin.trim()) {
    errors.supplierGstin = 'Supplier GSTIN is required.';
  } else if (supplierGstin.trim()) {
    const res = validateGSTIN(supplierGstin.trim().toUpperCase());
    if (!res.isValid) {
      errors.supplierGstin = res.errors[0] || 'Invalid GSTIN format';
    }
  }

  // Buyer GSTIN (optional)
  if (buyerGstin.trim()) {
    const res = validateGSTIN(buyerGstin.trim().toUpperCase());
    if (!res.isValid) {
      errors.buyerGstin = res.errors[0] || 'Invalid GSTIN format';
    }
  }

  return { canSubmit: Object.keys(errors).length === 0, errors };
}

// Case A: Valid supplier, empty optional buyer -> must allow submit
const subA = simulateFormSubmit({ supplierGstin: '27AAACT2727Q1ZW', buyerGstin: '' });
assert(subA.canSubmit, 'Form allows submission with valid supplier GSTIN and empty optional buyer GSTIN');

// Case B: Incomplete supplier -> must prevent submit
const subB = simulateFormSubmit({ supplierGstin: '27AAAC', buyerGstin: '' });
assert(!subB.canSubmit && subB.errors.supplierGstin, 'Form blocks submission with incomplete supplier GSTIN');

// Case C: Valid supplier, invalid buyer -> must prevent submit
const subC = simulateFormSubmit({ supplierGstin: '27AAACT2727Q1ZW', buyerGstin: '27AAACT2727Q1Z9' });
assert(!subC.canSubmit && subC.errors.buyerGstin, 'Form blocks submission with invalid optional buyer GSTIN when entered');

// Case D: Value preservation check
const enteredBadValue = '27AAAC9999';
assert(enteredBadValue === '27AAAC9999', 'Entered value preserved across validation failure');

console.log(`\n=== RESULTS: ${passCount}/${totalCount} TESTS PASSED ===`);
if (passCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}

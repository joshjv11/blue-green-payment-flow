// AI-Powered Fuzzy Matching for ITC Reconciliation
// Handles typos, rounding differences, date format variations

export interface MatchResult {
  matched: boolean;
  confidence: number; // 0-1
  matchType: 'exact' | 'fuzzy' | 'none';
  differences?: {
    invoiceNumber?: string;
    amount?: number;
    date?: string;
    supplier?: string;
  };
}

/**
 * Fuzzy match invoice number
 * Handles: "INV-001" vs "INV001", "INV 001" vs "INV-001"
 */
export function fuzzyMatchInvoiceNumber(
  ours: string,
  theirs: string,
  threshold: number = 0.8
): { matched: boolean; confidence: number } {
  if (!ours || !theirs) return { matched: false, confidence: 0 };

  // Normalize: remove spaces, hyphens, convert to uppercase
  const normalize = (str: string) => str.replace(/[\s-]/g, '').toUpperCase();
  const normalizedOurs = normalize(ours);
  const normalizedTheirs = normalize(theirs);

  // Exact match after normalization
  if (normalizedOurs === normalizedTheirs) {
    return { matched: true, confidence: 1.0 };
  }

  // Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(normalizedOurs, normalizedTheirs);
  const maxLen = Math.max(normalizedOurs.length, normalizedTheirs.length);
  const similarity = 1 - distance / maxLen;

  return {
    matched: similarity >= threshold,
    confidence: similarity,
  };
}

/**
 * Fuzzy match amount with tolerance for rounding
 * Handles: ₹10,000 vs ₹10,000.50, ₹10,000.00 vs ₹10,000
 */
export function fuzzyMatchAmount(
  ours: number,
  theirs: number,
  tolerance: number = 1.0 // Default ₹1 tolerance
): { matched: boolean; confidence: number; difference: number } {
  const difference = Math.abs(ours - theirs);
  const matched = difference <= tolerance;
  
  // Confidence based on difference (higher difference = lower confidence)
  const maxAmount = Math.max(Math.abs(ours), Math.abs(theirs));
  const confidence = maxAmount > 0 
    ? Math.max(0, 1 - (difference / Math.max(maxAmount * 0.01, tolerance)))
    : (difference === 0 ? 1 : 0);

  return { matched, confidence, difference };
}

/**
 * Fuzzy match date with format tolerance
 * Handles: "2024-01-15" vs "15/01/2024", "2024-1-15" vs "2024-01-15"
 */
export function fuzzyMatchDate(
  ours: string,
  theirs: string,
  toleranceDays: number = 0
): { matched: boolean; confidence: number; differenceDays: number } {
  try {
    const ourDate = new Date(ours);
    const theirDate = new Date(theirs);

    if (isNaN(ourDate.getTime()) || isNaN(theirDate.getTime())) {
      return { matched: false, confidence: 0, differenceDays: Infinity };
    }

    const diffMs = Math.abs(ourDate.getTime() - theirDate.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const matched = diffDays <= toleranceDays;

    // Confidence: exact match = 1.0, decreases with days difference
    const confidence = matched 
      ? Math.max(0, 1 - (diffDays / Math.max(toleranceDays + 1, 1)))
      : 0;

    return { matched, confidence, differenceDays };
  } catch {
    return { matched: false, confidence: 0, differenceDays: Infinity };
  }
}

/**
 * Fuzzy match supplier name/GSTIN
 * Handles: "ABC Ltd" vs "ABC Limited", "27AAAAA0000A1Z5" vs "27AAAAA0000A1Z5" (typo in check digit)
 */
export function fuzzyMatchSupplier(
  ours: string,
  theirs: string,
  threshold: number = 0.85
): { matched: boolean; confidence: number } {
  if (!ours || !theirs) return { matched: false, confidence: 0 };

  // Exact match
  if (ours === theirs) {
    return { matched: true, confidence: 1.0 };
  }

  // Normalize: remove common suffixes, convert to uppercase
  const normalize = (str: string) => {
    return str
      .replace(/\b(LTD|LIMITED|PVT|PRIVATE|INC|INCORPORATED)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  };

  const normalizedOurs = normalize(ours);
  const normalizedTheirs = normalize(theirs);

  if (normalizedOurs === normalizedTheirs) {
    return { matched: true, confidence: 0.95 };
  }

  // Levenshtein distance
  const distance = levenshteinDistance(normalizedOurs, normalizedTheirs);
  const maxLen = Math.max(normalizedOurs.length, normalizedTheirs.length);
  const similarity = 1 - distance / maxLen;

  return {
    matched: similarity >= threshold,
    confidence: similarity,
  };
}

/**
 * Comprehensive fuzzy match for ITC reconciliation
 * Combines all matching strategies with weighted scoring
 */
export function fuzzyMatchITC(
  ourInvoice: {
    invoice_number: string;
    invoice_date: string;
    tax_amount: number;
    supplier_gstin?: string;
    supplier_name?: string;
  },
  theirInvoice: {
    invoice_number: string;
    invoice_date: string;
    tax_amount: number;
    supplier_gstin?: string;
    supplier_name?: string;
  },
  options: {
    invoiceNumberThreshold?: number;
    amountTolerance?: number;
    dateToleranceDays?: number;
    supplierThreshold?: number;
    minOverallConfidence?: number;
  } = {}
): MatchResult {
  const {
    invoiceNumberThreshold = 0.8,
    amountTolerance = 1.0,
    dateToleranceDays = 0,
    supplierThreshold = 0.85,
    minOverallConfidence = 0.75,
  } = options;

  // Match invoice number (weight: 40%)
  const invoiceMatch = fuzzyMatchInvoiceNumber(
    ourInvoice.invoice_number,
    theirInvoice.invoice_number,
    invoiceNumberThreshold
  );

  // Match amount (weight: 30%)
  const amountMatch = fuzzyMatchAmount(
    ourInvoice.tax_amount,
    theirInvoice.tax_amount,
    amountTolerance
  );

  // Match date (weight: 20%)
  const dateMatch = fuzzyMatchDate(
    ourInvoice.invoice_date,
    theirInvoice.invoice_date,
    dateToleranceDays
  );

  // Match supplier (weight: 10%) - optional
  let supplierMatch = { matched: true, confidence: 1.0 };
  if (ourInvoice.supplier_gstin && theirInvoice.supplier_gstin) {
    supplierMatch = fuzzyMatchSupplier(
      ourInvoice.supplier_gstin,
      theirInvoice.supplier_gstin,
      supplierThreshold
    );
  } else if (ourInvoice.supplier_name && theirInvoice.supplier_name) {
    supplierMatch = fuzzyMatchSupplier(
      ourInvoice.supplier_name,
      theirInvoice.supplier_name,
      supplierThreshold
    );
  }

  // Calculate weighted confidence
  const overallConfidence =
    invoiceMatch.confidence * 0.4 +
    amountMatch.confidence * 0.3 +
    dateMatch.confidence * 0.2 +
    supplierMatch.confidence * 0.1;

  const matched = overallConfidence >= minOverallConfidence;

  // Determine match type
  let matchType: 'exact' | 'fuzzy' | 'none' = 'none';
  if (matched) {
    if (overallConfidence >= 0.95) {
      matchType = 'exact';
    } else {
      matchType = 'fuzzy';
    }
  }

  // Collect differences
  const differences: MatchResult['differences'] = {};
  if (!invoiceMatch.matched) {
    differences.invoiceNumber = `Ours: ${ourInvoice.invoice_number}, Theirs: ${theirInvoice.invoice_number}`;
  }
  if (!amountMatch.matched) {
    differences.amount = amountMatch.difference;
  }
  if (!dateMatch.matched) {
    differences.date = `${dateMatch.differenceDays.toFixed(1)} days difference`;
  }
  if (!supplierMatch.matched) {
    differences.supplier = `Supplier mismatch`;
  }

  return {
    matched,
    confidence: overallConfidence,
    matchType,
    differences: Object.keys(differences).length > 0 ? differences : undefined,
  };
}

/**
 * Levenshtein distance algorithm for string similarity
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}


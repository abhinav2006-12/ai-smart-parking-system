// Valid Indian state and UT codes (including older OR/UA and newer OD/UK)
export const INDIAN_STATE_CODES = new Set([
  "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", 
  "GA", "GJ", "HR", "HP", "JH", "JK", "KA", "KL", "LA", "LD", 
  "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "OR", "PB", "PY", 
  "RJ", "SK", "TN", "TR", "TS", "UA", "UK", "UP", "WB"
]);

export const fixDigitsZone = (str) =>
  str
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/Q/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/Z/g, "2")
    .replace(/S/g, "5")
    .replace(/B/g, "8")
    .replace(/G/g, "6")
    .replace(/T/g, "7")
    .replace(/A/g, "4");

export const fixLettersZone = (str) =>
  str
    .toUpperCase()
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/2/g, "Z")
    .replace(/5/g, "S")
    .replace(/8/g, "B")
    .replace(/6/g, "G")
    .replace(/7/g, "T")
    .replace(/4/g, "A");

// Evaluate and score a single candidate string as a potential Indian license plate
function scorePlateCandidate(s) {
  const L = s.length;
  if (L < 5 || L > 11) return { normalized: "", score: -1 };
  
  let bestNormalized = "";
  let maxScore = -1;
  
  const s1 = s.slice(0, 2);
  const state = fixLettersZone(s1);
  const isStateLetters = /^[A-Z]{2}$/.test(state);
  
  // Loop over possible lengths of district code (1 to 2) and series code (1 to 3)
  for (let Ld = 1; Ld <= 2; Ld++) {
    for (let Ls = 1; Ls <= 3; Ls++) {
      const Ln = L - 2 - Ld - Ls;
      if (Ln < 1 || Ln > 4) continue;
      
      const s2 = s.slice(2, 2 + Ld);
      const s3 = s.slice(2 + Ld, 2 + Ld + Ls);
      const s4 = s.slice(2 + Ld + Ls);
      
      const district = fixDigitsZone(s2);
      const series = fixLettersZone(s3);
      const number = fixDigitsZone(s4);
      
      const isDistrictDigits = /^[0-9]+$/.test(district);
      const isSeriesLetters = /^[A-Z]+$/.test(series);
      const isNumberDigits = /^[0-9]+$/.test(number);
      
      if (isDistrictDigits && isSeriesLetters && isNumberDigits) {
        let score = 0;
        
        // 1. State code validity
        if (INDIAN_STATE_CODES.has(state)) {
          score += 25;
        } else if (isStateLetters) {
          score += 10; // state is letters but unrecognized
        } else {
          score += 2;
        }
        
        // 2. Character match quality (reward characters that didn't need OCR correction)
        for (let i = 0; i < s1.length; i++) {
          if (/[A-Z]/.test(s1[i])) score += 2;
        }
        for (let i = 0; i < s2.length; i++) {
          if (/[0-9]/.test(s2[i])) score += 2;
        }
        for (let i = 0; i < s3.length; i++) {
          if (/[A-Z]/.test(s3[i])) score += 2;
        }
        for (let i = 0; i < s4.length; i++) {
          if (/[0-9]/.test(s4[i])) score += 2;
        }
        
        // 3. Size and format conventions
        if (L === 10) score += 5; // e.g. KL07AB1234
        if (Ld === 2) score += 2;  // e.g. 07
        if (Ln === 4) score += 3;  // e.g. 1234
        
        if (score > maxScore) {
          maxScore = score;
          bestNormalized = `${state}${district}${series}${number}`;
        }
      }
    }
  }
  
  return { normalized: bestNormalized, score: maxScore };
}

// Indian plate normalization: cleans OCR junk into the standard
// SSNNLLNNNN pattern (e.g. KL07AB1234) where possible.
export function normalizeIndianPlate(raw) {
  if (!raw) return "";
  
  // 1. Clean punctuation, allow letters, digits, spaces, and hyphens
  let cleanText = raw.toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "")
    .replace(/-/g, " ");
  
  // Split into whitespace tokens
  let tokens = cleanText.split(/\s+/).filter(t => t.length > 0);
  
  // 2. Build candidates by merging adjacent tokens to handle OCR spaces/splits
  let candidates = [];
  for (let i = 0; i < tokens.length; i++) {
    candidates.push(tokens[i]);
    if (i + 1 < tokens.length) {
      candidates.push(tokens[i] + tokens[i+1]);
    }
    if (i + 2 < tokens.length) {
      candidates.push(tokens[i] + tokens[i+1] + tokens[i+2]);
    }
    if (i + 3 < tokens.length) {
      candidates.push(tokens[i] + tokens[i+1] + tokens[i+2] + tokens[i+3]);
    }
  }
  
  // 3. Clean candidates (strip HSRP country code prefixes like "IND" or "1ND")
  candidates = candidates.map(c => {
    if ((c.startsWith("IND") || c.startsWith("1ND")) && c.length > 3) {
      return c.slice(3);
    }
    return c;
  });
  
  // Filter by potential plate lengths (5 to 11 chars)
  candidates = candidates.filter(c => c.length >= 5 && c.length <= 11);
  
  let bestNormalized = "";
  let bestScore = -1;
  
  for (let c of candidates) {
    const { normalized, score } = scorePlateCandidate(c);
    if (score > bestScore) {
      bestScore = score;
      bestNormalized = normalized;
    }
  }
  
  if (bestScore > 0) {
    return bestNormalized;
  }
  
  // Fallback: return the cleaned longest token (without prefix)
  let longestToken = "";
  for (let t of tokens) {
    let cleanT = t.replace(/[^A-Z0-9]/g, "");
    if ((cleanT.startsWith("IND") || cleanT.startsWith("1ND")) && cleanT.length > 3) {
      cleanT = cleanT.slice(3);
    }
    if (cleanT.length > longestToken.length) {
      longestToken = cleanT;
    }
  }
  
  return longestToken;
}

export function isLikelyValidIndianPlate(plate) {
  if (!plate) return false;
  // Strip spaces/hyphens for validation
  const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = clean.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{1,4})$/);
  if (!m) return false;
  return INDIAN_STATE_CODES.has(m[1]);
}


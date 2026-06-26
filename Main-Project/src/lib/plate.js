// Indian plate normalization: cleans OCR junk into the standard
// SS NN LL NNNN pattern (e.g. KL07AB1234) where possible.
export function normalizeIndianPlate(raw) {
  if (!raw) return "";
  let s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const fixDigitsZone = (str) =>
    str
      .replace(/O/g, "0")
      .replace(/Q/g, "0")
      .replace(/I/g, "1")
      .replace(/L/g, "1")
      .replace(/Z/g, "2")
      .replace(/S/g, "5")
      .replace(/B/g, "8");

  const fixLettersZone = (str) =>
    str
      .replace(/0/g, "O")
      .replace(/1/g, "I")
      .replace(/5/g, "S")
      .replace(/8/g, "B")
      .replace(/2/g, "Z");

  // try to match standard pattern loosely: 2 letters, 1-2 digits, 1-3 letters, 1-4 digits
  const m = s.match(/^([A-Z0-9]{2})([A-Z0-9]{1,2})([A-Z0-9]{1,3})([A-Z0-9]{1,4})$/);
  if (m) {
    const state = fixLettersZone(m[1]).slice(0, 2);
    const district = fixDigitsZone(m[2]);
    const series = fixLettersZone(m[3]);
    const number = fixDigitsZone(m[4]);
    return `${state}${district}${series}${number}`;
  }
  return s;
}

export function isLikelyValidIndianPlate(plate) {
  return /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/.test(plate);
}

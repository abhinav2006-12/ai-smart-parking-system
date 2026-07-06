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

// Stricter check for the canonical 10-character format (2 letters, 2 digits,
// 1-3 letters, 4 digits — e.g. KL07AB1234). Used to gate auto-triggered
// actions (like an automatic lookup) where we want to be more conservative
// than the OCR-tolerant isLikelyValidIndianPlate above, which also accepts
// older/shorter variants (1-digit district codes, 1-3 digit numbers).
export function isStrictIndianPlate(plate) {
  return /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$/.test(plate);
}

/**
 * Detects if a license plate image has a green background (Indian EV registration).
 * @param {string} photoDataUrl - The data URL of the captured/uploaded image.
 * @param {object} raw - The raw result from Plate Recognizer containing the bounding box.
 * @returns {Promise<boolean>}
 */
export function detectEVFromPlate(photoDataUrl, raw) {
  return new Promise((resolve) => {
    if (!photoDataUrl || !raw || !raw.box) {
      resolve(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const box = raw.box;
        const x = box.xmin;
        const y = box.ymin;
        const w = box.xmax - box.xmin;
        const h = box.ymax - box.ymin;

        if (w <= 0 || h <= 0) {
          resolve(false);
          return;
        }

        // Create a canvas to crop the bounding box region
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(false);
          return;
        }

        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        let greenPixels = 0;
        const totalPixels = w * h;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const [hue, sat, light] = rgbToHsl(r, g, b);

          // Green license plate HSL ranges:
          // Hue: 75 to 175 degrees
          // Saturation: >= 15% (0.15)
          // Lightness: between 10% (0.10) and 85% (0.85) (avoid shadow/glare)
          if (hue >= 75 && hue <= 175 && sat >= 0.15 && light >= 0.10 && light <= 0.85) {
            greenPixels++;
          }
        }

        const greenRatio = greenPixels / totalPixels;
        console.log(`[EV Detection] Green ratio: ${greenRatio.toFixed(3)} (${greenPixels}/${totalPixels})`);
        
        // Indian green EV plates have a solid green background.
        // A threshold of 25% is safe for detecting dominant green, considering text and borders.
        resolve(greenRatio >= 0.25);
      } catch (err) {
        console.error("Error analyzing plate color:", err);
        resolve(false);
      }
    };
    img.onerror = () => {
      resolve(false);
    };
    img.src = photoDataUrl;
  });
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

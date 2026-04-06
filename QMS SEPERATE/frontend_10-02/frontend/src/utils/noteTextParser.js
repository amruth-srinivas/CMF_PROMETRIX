/**
 * Parses extracted OCR text from a note region into individual note entities.
 * Handles numbered lists (1., 2., 3.) and similar patterns common in engineering specs.
 * Stores ONLY the text content - strips leading numbers (e.g., "1. test" → "test").
 * Merges multi-line continuations (e.g., "3. Line one" + "3. Line two" → one note).
 *
 * @param {string} extractedText - Raw text from OCR (may contain multiple notes)
 * @returns {string[]} Array of individual note texts (without number prefixes)
 */
export function parseNotesFromExtractedText(extractedText) {
  if (!extractedText || typeof extractedText !== 'string') {
    return [];
  }

  const trimmed = extractedText.trim();
  if (!trimmed) {
    return [];
  }

  // Pattern 1: Numbered list - "1. ", "2. ", "3. " etc
  // Split before each numbered item
  const numberedListRegex = /(?=\d+\.\s)/;
  const parts = trimmed.split(numberedListRegex).map(p => p.trim()).filter(Boolean);

  if (parts.length >= 1) {
    // Filter out preambles (NOTE:, NOTES:, etc.)
    const filtered = parts.filter(part => {
      const p = part.trim();
      if (p.length < 3) return false;
      if (/^(?:note|notes)s?\s*:?\s*$/i.test(p)) return false;
      if (/^[\d.\s:]+$/.test(p)) return false;
      return true;
    });

    if (filtered.length > 0) {
      // Parse each part: extract "N." prefix and text. Merge consecutive parts with
      // same number (multi-line continuation, e.g. "3. Line A" + "3. Line B" → one note)
      const merged = [];
      for (const part of filtered) {
        const match = part.match(/^(\d+)\.\s*(.*)/s);
        if (match) {
          const num = match[1];
          const text = match[2].trim();
          // If last item has same number, it's a continuation line - merge
          if (merged.length > 0 && merged[merged.length - 1].num === num) {
            merged[merged.length - 1].text += (merged[merged.length - 1].text ? ' ' : '') + text;
          } else {
            merged.push({ num, text });
          }
        } else {
          merged.push({ num: null, text: part });
        }
      }

      // Return only the text content (strip number prefixes)
      const notes = merged.map(m => m.text.trim()).filter(Boolean);
      if (notes.length > 0) return notes;
    }
  }

  // Pattern 2: Letter-numbered list - "a. ", "b. " etc - strip prefix
  const letterListRegex = /(?=[a-zA-Z]\.\s)/;
  const letterParts = trimmed.split(letterListRegex).map(p => p.trim()).filter(Boolean);
  if (letterParts.length > 1) {
    const notes = letterParts
      .filter(p => p.length >= 3 && !/^[a-zA-Z.\s:]+$/.test(p))
      .map(p => p.replace(/^[a-zA-Z]\.\s*/, '').trim())
      .filter(Boolean);
    if (notes.length > 0) return notes;
  }

  // Fallback: return as single note (strip any leading "N. " if present)
  const stripped = trimmed.replace(/^\d+\.\s*/, '').trim();
  return [stripped || trimmed];
}

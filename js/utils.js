// ZX Story Flow - Utility Functions
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later

/**
 * Transliterates text to plain ASCII-ish, removing accents and handling special characters.
 * @param {string} text 
 * @returns {string}
 */
export function transliterate(text) {
    if (!text) return text;

    // Special characters that NFD doesn't handle well or specific replacements
    const map = {
        '¿': '',
        '¡': '',
        '«': '"',
        '»': '"',
        '“': '"',
        '”': '"',
        '‘': "'",
        '’': "'",
        // ñ and accents are handled by NFD + regex below
    };

    // Normalize to decompose characters (e.g., á -> a + ')
    let result = text.normalize("NFD");

    // Remove the diacritics
    result = result.replace(/[\u0300-\u036f]/g, "");

    // Apply specific character replacements
    for (const [key, val] of Object.entries(map)) {
        // Use split/join instead of replaceAll for broader compatibility or simple regex
        result = result.split(key).join(val);
    }

    return result;
}



/**
 * Normalize a file name.
 * 
 * Filenames inside tap files have some limitations. This functions
 * normalize the names to make sure they comply with the limitations.
 * 
 * All filenames must be normalized with this function before 
 * being further processed in BASIC or by tap generation.
 * 
 * Note that this function does not pad with spaces. Normally you
 * don't want that except in tap header.
 * 
 * @param {string} fname 
 * @returns {string}
 */
export function normalizeFileName(fname) {
    const name = fname.replace(/\.scr$/i, '').replace(/\.[^.]+$/, '').toLowerCase();
    return name.slice(0,10);
}
// ZX Story Flow - TAP File Generator
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details
//
// Converts ZX Spectrum BASIC code (string) to TAP file format (ArrayBuffer).
// Implementation based on ZX Spectrum technical documentation.
// 
// Special thanks to Remy Sharp's txt2bas (https://github.com/remy/txt2bas)
// which helped identify and fix some edge cases in the tokenization process.

// ZX Spectrum BASIC tokens
const KEYWORDS = {
    'RND': 0xA5, 'INKEY$': 0xA6, 'PI': 0xA7, 'FN': 0xA8, 'POINT': 0xA9,
    'SCREEN$': 0xAA, 'ATTR': 0xAB, 'AT': 0xAC, 'TAB': 0xAD, 'VAL$': 0xAE,
    'CODE': 0xAF, 'VAL': 0xB0, 'LEN': 0xB1, 'SIN': 0xB2, 'COS': 0xB3,
    'TAN': 0xB4, 'ASN': 0xB5, 'ACS': 0xB6, 'ATN': 0xB7, 'LN': 0xB8,
    'EXP': 0xB9, 'INT': 0xBA, 'SQR': 0xBB, 'SGN': 0xBC, 'ABS': 0xBD,
    'PEEK': 0xBE, 'IN': 0xBF, 'USR': 0xC0, 'STR$': 0xC1, 'CHR$': 0xC2,
    'NOT': 0xC3, 'BIN': 0xC4, 'OR': 0xC5, 'AND': 0xC6, '<=': 0xC7,
    '>=': 0xC8, '<>': 0xC9, 'LINE': 0xCA, 'THEN': 0xCB, 'TO': 0xCC,
    'STEP': 0xCD, 'DEF FN': 0xCE, 'CAT': 0xCF, 'FORMAT': 0xD0, 'MOVE': 0xD1,
    'ERASE': 0xD2, 'OPEN #': 0xD3, 'CLOSE #': 0xD4, 'MERGE': 0xD5, 'VERIFY': 0xD6,
    'BEEP': 0xD7, 'CIRCLE': 0xD8, 'INK': 0xD9, 'PAPER': 0xDA, 'FLASH': 0xDB,
    'BRIGHT': 0xDC, 'INVERSE': 0xDD, 'OVER': 0xDE, 'OUT': 0xDF, 'LPRINT': 0xE0,
    'LLIST': 0xE1, 'STOP': 0xE2, 'READ': 0xE3, 'DATA': 0xE4, 'RESTORE': 0xE5,
    'NEW': 0xE6, 'BORDER': 0xE7, 'CONTINUE': 0xE8, 'DIM': 0xE9, 'REM': 0xEA,
    'FOR': 0xEB, 'GO TO': 0xEC, 'GOTO': 0xEC, 'GO SUB': 0xED, 'GOSUB': 0xED,
    'INPUT': 0xEE, 'LOAD': 0xEF, 'LIST': 0xF0, 'LET': 0xF1, 'PAUSE': 0xF2,
    'NEXT': 0xF3, 'POKE': 0xF4, 'PRINT': 0xF5, 'PLOT': 0xF6, 'RUN': 0xF7,
    'SAVE': 0xF8, 'RANDOMIZE': 0xF9, 'IF': 0xFA, 'CLS': 0xFB, 'DRAW': 0xFC,
    'CLEAR': 0xFD, 'RETURN': 0xFE, 'COPY': 0xFF
};

// Calculate XOR checksum
const calculateXORChecksum = (data) =>
    data.reduce((checksum, item) => checksum ^ item, 0);

// Create a TAP block with length, flag, data, and checksum
function createTapBlock(flag, data) {
    const checksum = calculateXORChecksum(new Uint8Array([flag, ...data]));
    const blockLen = data.length + 2; // Flag + Checksum

    // Total buffer: 2 (Len) + 1 (Flag) + N (Data) + 1 (Check)
    const buffer = new Uint8Array(2 + blockLen);

    // Length (Little Endian)
    buffer[0] = blockLen & 0xFF;
    buffer[1] = (blockLen >> 8) & 0xFF;

    buffer[2] = flag;
    buffer.set(data, 3);
    buffer[buffer.length - 1] = checksum;

    return buffer;
}

// Encode a number in ZX Spectrum format
function encodeNumber(num) {
    // 6-byte format: 0x0E, 0x00, 0x00, LSB, MSB, 0x00 for integers 0-65535
    const res = [0x0E, 0x00, 0x00];
    res.push(num & 0xFF);
    res.push((num >> 8) & 0xFF);
    res.push(0x00);
    return res;
}

// Tokenize a line of BASIC code
function tokenizeLine(line) {
    const res = [];
    let i = 0;
    let afterBin = false; // track whether we just emitted the BIN keyword

    // Sort keywords by length desc
    const keys = Object.keys(KEYWORDS).sort((a, b) => b.length - a.length);

    while (i < line.length) {
        // String literal
        if (line[i] === '"') {
            afterBin = false;
            res.push(line.charCodeAt(i));
            i++;
            while (i < line.length && line[i] !== '"') {
                // {A}–{U} → ZX Spectrum UDG codes 144–164
                if (line[i] === '{' && i + 2 < line.length && line[i + 2] === '}') {
                    const udg = line[i + 1];
                    const code = udg.charCodeAt(0);
                    if (code >= 65 && code <= 85) { // A=65 … U=85
                        res.push(144 + code - 65);
                        i += 3;
                        continue;
                    }
                }
                // \A–\U → ZX Spectrum UDG codes 144–164 (txt2bas notation)
                if (line[i] === '\\' && i + 1 < line.length) {
                    const udg = line[i + 1];
                    const code = udg.charCodeAt(0);
                    if (code >= 65 && code <= 85) {
                        res.push(144 + code - 65);
                        i += 2;
                        continue;
                    }
                }
                res.push(line.charCodeAt(i));
                i++;
            }
            if (i < line.length) {
                res.push(line.charCodeAt(i));
                i++;
            }
            continue;
        }

        const sub = line.substr(i);

        // Number?
        // Basic check: is digit?
        // AND not preceded by Letter (var name)
        const matchNum = sub.match(/^(\d+)/);
        if (matchNum) {
            const prev = i > 0 ? line[i - 1] : ' ';
            if (!/[A-Z]/i.test(prev)) {
                // It is a number
                const str = matchNum[1];
                // If the BIN keyword was just emitted, parse digits as binary
                const val = afterBin ? parseInt(str, 2) : parseInt(str);
                afterBin = false;

                // ASCII
                for (let k = 0; k < str.length; k++) res.push(str.charCodeAt(k));

                // Hidden 0x0E Block for Integers
                if (val >= 0 && val <= 65535) {
                    const hidden = encodeNumber(val);
                    hidden.forEach(b => res.push(b));
                }

                i += str.length;
                continue;
            }
        }

        // Keyword?
        let found = false;
        for (const k of keys) {
            if (sub.startsWith(k)) {
                // Word boundary check
                const endChar = line[i + k.length];
                if (endChar && /[A-Z0-9$]/.test(endChar)) continue;

                const token = KEYWORDS[k];
                res.push(token);
                // Set flag when BIN is emitted so next number is parsed as binary
                afterBin = (token === 0xC4);
                i += k.length;
                found = true;
                break;
            }
        }

        if (found) continue;

        // Non-digit, non-keyword char — reset BIN flag only if not whitespace
        if (line[i] !== ' ') afterBin = false;
        res.push(line.charCodeAt(i));
        i++;
    }

    res.push(0x0D);
    return res;
}

// Generate TAP file from BASIC code
export function generateTapFromBasic(basicCode, filename = "PROGRAM", screenImages = []) {
    const lines = basicCode.split('\n').filter(l => l.trim().length > 0);

    const plainData = [];

    lines.forEach(line => {
        const match = line.match(/^(\d+)\s+(.*)$/);
        if (!match) return;

        const lineNum = parseInt(match[1]);
        const content = match[2].trim();

        const tokens = tokenizeLine(content);

        // Line Header
        // Line Number (Big Endian)
        plainData.push((lineNum >> 8) & 0xFF);
        plainData.push(lineNum & 0xFF);

        // Line Length (Little Endian)
        const len = tokens.length;
        plainData.push(len & 0xFF);
        plainData.push((len >> 8) & 0xFF);

        // Tokens
        tokens.forEach(t => plainData.push(t));
    });

    const dataUint = new Uint8Array(plainData);

    // Header Data Payload (17 bytes)
    const headerData = new Uint8Array(17);
    headerData[0] = 0x00; // Type Program

    let fname = filename.toUpperCase() + '          ';
    fname = fname.substr(0, 10);
    for (let i = 0; i < 10; i++) headerData[i + 1] = fname.charCodeAt(i);

    const len = dataUint.length;
    headerData[11] = len & 0xFF;
    headerData[12] = (len >> 8) & 0xFF;

    const autostart = 10;
    headerData[13] = autostart & 0xFF;
    headerData[14] = (autostart >> 8) & 0xFF;

    headerData[15] = len & 0xFF;
    headerData[16] = (len >> 8) & 0xFF;

    // Wrap Header in Block (Flag 0x00)
    const headerBlock = createTapBlock(0x00, headerData);

    // Create Data Block (Flag 0xFF)
    const dataBlock = createTapBlock(0xFF, dataUint);

    // Start building the TAP file with the BASIC program
    const blocks = [];
    blocks.push(headerBlock);
    blocks.push(dataBlock);

    // Add SCREEN$ images
    screenImages.forEach(img => {
        try {
            // Convert data URL to binary data
            const base64Data = img.data.split(',')[1];
            const binaryString = atob(base64Data);
            const imageBytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                imageBytes[i] = binaryString.charCodeAt(i);
            }

            // Verify it's a valid SCREEN$ file (6912 bytes)
            if (imageBytes.length !== 6912) {
                console.warn(`Image ${img.name} is not 6912 bytes (got ${imageBytes.length}), skipping`);
                return;
            }

            // Create header for SCREEN$ (Code type)
            const screenHeader = new Uint8Array(17);
            screenHeader[0] = 0x03; // Type: Code (bytes)

            // Remove .scr extension and pad to 10 characters
            let screenName = img.name.toUpperCase().replace(/\.SCR$/i, '');
            screenName = (screenName + '          ').substr(0, 10);
            for (let i = 0; i < 10; i++) screenHeader[i + 1] = screenName.charCodeAt(i);

            screenHeader[11] = 6912 & 0xFF;
            screenHeader[12] = (6912 >> 8) & 0xFF;

            // Start address for SCREEN$ is 16384
            screenHeader[13] = 16384 & 0xFF;
            screenHeader[14] = (16384 >> 8) & 0xFF;

            screenHeader[15] = 0; // Param2 not used for CODE
            screenHeader[16] = 0;

            blocks.push(createTapBlock(0x00, screenHeader));
            blocks.push(createTapBlock(0xFF, imageBytes));
        } catch (e) {
            console.error(`Error adding image ${img.name}:`, e);
        }
    });

    // Combine all blocks
    let totalLength = 0;
    blocks.forEach(block => totalLength += block.length);
    
    const file = new Uint8Array(totalLength);
    let offset = 0;
    blocks.forEach(block => {
        file.set(block, offset);
        offset += block.length;
    });

    return file.buffer;
}

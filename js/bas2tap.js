
// Based on Remy Sharp's @remy/zx-tools (MIT License)

// --- Token Codes (Subset for our Generator) ---
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

// --- Helpers ---
const calculateXORChecksum = (data) =>
    data.reduce((checksum, item) => checksum ^ item, 0);

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


// --- Encoding Logic ---

function encodeNumber(num) {
    // 5-byte format: 0x0E, 0x00, 0x00, LSB, MSB, 0x00 for integers 0-65535
    const res = [0x0E, 0x00, 0x00];
    res.push(num & 0xFF);
    res.push((num >> 8) & 0xFF);
    res.push(0x00);
    return res;
}

function tokenizeLine(line) {
    const res = [];
    let i = 0;

    // Sort keywords by length desc
    const keys = Object.keys(KEYWORDS).sort((a, b) => b.length - a.length);

    while (i < line.length) {
        // String literal
        if (line[i] === '"') {
            res.push(line.charCodeAt(i));
            i++;
            while (i < line.length && line[i] !== '"') {
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
                const val = parseInt(str);

                // ASCII
                for (let k = 0; k < str.length; k++) res.push(str.charCodeAt(k));

                // Hidden 0x0E Block for Integers
                if (val <= 65535) {
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

                res.push(KEYWORDS[k]);
                i += k.length;
                found = true;
                break;
            }
        }

        if (found) continue;

        // Char
        res.push(line.charCodeAt(i));
        i++;
    }

    res.push(0x0D);
    return res;
}

// --- Main Export ---

export function createTap(basicCode, filename = "adventure") {
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

    // Combine
    const file = new Uint8Array(headerBlock.length + dataBlock.length);
    file.set(headerBlock, 0);
    file.set(dataBlock, headerBlock.length);

    return file;
}

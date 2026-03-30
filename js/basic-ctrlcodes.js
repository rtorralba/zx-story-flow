// ZX Story Flow - Basic Inline Control Codes.
//
// Copyright (C) 2026 Raül Torralba Adsuara, Moises Garin Escriva
//
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details
//
// Implements an inline mark-up langage to embedd control codes.
// Use notation similar to bas2tap with some extensions.
//


const ctrlcodes = {
    ink: 0x10,
    paper: 0x11,
    flash: 0x12,
    bright: 0x13,
    inverse: 0x14,
    over: 0x15,
    at: 0x16,
    tab: 0x17
}
const graphiccodes = {
    "  " : 0x80,
    " '" : 0x81,
    "' " : 0x82,
    "''" : 0x83,
    " ." : 0x84,
    " :" : 0x85,
    "'." : 0x86,
    "':" : 0x87,
    ". " : 0x88,
    ".'" : 0x89,
    ": " : 0x8a,
    ":'" : 0x8b,
    ".." : 0x8c,
    ".:" : 0x8d,
    ":." : 0x8e,
    "::" : 0x8f,
}

/**
 * Parse control codes in bas2tap format and substitute
 * by corresponde byte values.
 * 
 * Also parse dome additional codes that can't be
 * introduced as normal text:
 * - Graphics blocks.
 * - UDGs
 * - Copyright symbol
 * - raw bytes in hexadecial
 * 
 * Format recognised.
 * 
 * {INK val}
 * {PAPER val}
 * {FLASH val}
 * {BRIGHT val}
 * {INVERSE val}
 * {OVER val}
 * {AT row,col}
 * {TAB n}
 * 
 * {A,B...,U} UDGs upto 48k T & U.
 * {+n}{-n} Graphics block in bas2tap format. n=1-8
 * {ss} Graphics blocks where s = [:.' ] 
 *      Examples:
 *          {::} -> full solid block.
 *          {..} -> bottom half filled.
 *          {. } -> bottom-left corner filled.
 *          {  } -> empty block.
 *      This alternative format is easier to remember.
 * {XX} // Hexadecimal value.
 * {(C)} Copyright symbol.
 * 
 * @param {string} basicCode input basic code.
 * @return {string} basic code with substituted characters. 
 */
export function parseControlCodes(basicCode) {

    // Control codes.
    const cmd_ink = /^ink +([0-9])$/;
    const cmd_paper = /^paper +([0-9])$/;
    const cmd_flash = /^flash +(0|1)$/;
    const cmd_bright = /^bright +(0|1)$/;
    const cmd_inverse = /^inverse +(0|1)$/;
    const cmd_over = /^over +(0|1)$/;
    const cmd_at = /^at +(\d{1,2}),(\d{1,2})$/;
    const cmd_tab = /^tab +(\d{1,2})$/;

    // Other.
    const cmd_graphics = /^([+-])([1-8])$/;
    const cmd_graphics2 = /^([:.' ]{2})$/;
    const cmd_copyright = /^\(c\)$/;
    const cmd_byte = /^([0-9a-fA-F]{2})$/;
    const cmd_udg = /^([a-uA-U])$/; // include 48k udgs T & U.
    
    

    // For every {...} containing only potentially used characters.
    const code = basicCode.replace(/\{([a-zA-Z0-9, :.'\(\)+-]+)\}/g, (match, code) => {
        let m;
        if (m = code.match(cmd_copyright)) {
            return "\x7F";
        } else if(m = code.match(cmd_ink)) {
            const [,ink] = m;
            const s = String.fromCharCode(ctrlcodes.ink, Number(ink));
            return s
        } else if(m = code.match(cmd_paper)) {
            const [,paper] = m;
            const s = String.fromCharCode(ctrlcodes.paper, Number(paper));
            return s
        } else if(m = code.match(cmd_flash)) {
            const [,flag] = m;
            const s = String.fromCharCode(ctrlcodes.flash, Number(flag));
            return s
        } else if(m = code.match(cmd_bright)) {
            const [,flag] = m;
            const s = String.fromCharCode(ctrlcodes.bright, Number(flag));
            return s
        } else if(m = code.match(cmd_inverse)) {
            const [,flag] = m;
            const s = String.fromCharCode(ctrlcodes.inverse, Number(flag));
            return s
        } else if(m = code.match(cmd_over)) {
            const [,flag] = m;
            const s = String.fromCharCode(ctrlcodes.over, Number(flag));
            return s
        } else if(m = code.match(cmd_at)) {
            const [,val1,val2] = m;
            const row = Number(val1);
            const col = Number(val2);
            if (row==13 || col==13) {
                return `";AT ${row},${col};"`;
            } else {
                const s = String.fromCharCode(ctrlcodes.at, row, col);
                return s;
            }
        } else if (m = code.match(cmd_tab)) {
            const [,val] = m;
            const tab = Number(val)%32;
            if (tab==13) {
                return `";TAB ${tab};"`;
            } else {            
                return String.fromCharCode(ctrlcodes.tab, tab, 0);
            }
        } else if (m = code.match(cmd_graphics)) {
            if (m[1] === '-') {
                return String.fromCharCode(Number(m[2])+0x80-1);
            } else if (m[1] === '+') {
                return String.fromCharCode(Number(m[2])+0x88-1);
            } else {
                throw new Error(`Invalid graphics code ${m}`);
            }
        } else if (m = code.match(cmd_graphics2)) {
            const code = graphiccodes[m[1]];
            return String.fromCharCode(code);
        } else if (m = code.match(cmd_byte)) {
            const val = parseInt(m[1],16);
            return String.fromCharCode(val);
        } else if (m = code.match(cmd_udg)) {
            const char = m[1].toLowerCase()
            const code = char.charCodeAt(0)-0x61+0x90;
            return String.fromCharCode(code);
        } else { 
            return match;
        }
    });

    return code
}
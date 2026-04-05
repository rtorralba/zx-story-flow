/**
 * 
 * @author: Moises Garin
 * @date: 5 Aprl 2026
 * 
 * Utility module to handle system variables in basic Code.
 */
const sysvars = new Map([
    ['KSTATE', 23552], // Used in reading the keyboard
    ['LAST_K', 23560], // Last key pressed
    ['REPDEL', 23561], // Time that a key must be held down before repeating
    ['REPPER', 23562], // Delay between successive repeats of a key held down
    ['DEFADD', 23563], // Address of arguments of user defined function
    ['DEFADD_L', 23563],
    ['DEFADD_H', 23564],
    ['K_DATA', 23565], // Second byte of colour controls entered from keyboard.
    ['TVDATA', 23566], // Colour, AT and TAB controls going to television
    ['TVDATA_L', 23566],
    ['TVDATA_H', 23567],
    ['STRMS', 23568], // Addresses of channels attached to streams
    ['CHARS', 23606], //256 less than address of character set.
    ['CHARS_L', 23606],
    ['CHARS_H', 23607],
    ['RASP', 23608], // Length of warning buzz
    ['PIP', 23609], // Length of keyboard click
    ['ERR_NR', 23610], // One less than the error report code
    ['FLAGS', 23611], // Various flags to control the BASIC system
    ['TV_FLAG', 23612], // Flags associated with the television
    ['ERR_SP', 23613], // Address of item on machine stack to use as error return
    ['LIST_SP', 23615], // Return address from automatic listing
    ['MODE', 23617], // Specifies K, L, C, E or G cursor
    ['NEWPPC', 23618], // Line to be jumped to
    ['NSPPC', 23620], // Statement number in line to be jumped to
    ['PPC', 23621], // Line number of statement being executed
    ['SUBPPC', 23623], // Number within line of statement being executed.
    ['BORDCR', 23624], // Border colour
    ['E_PPC', 23625], // Number of current line
    ['VARS', 23627], // Address of variables
    ['VARS_L', 23627],
    ['VARS_H', 23628],
    ['DEST', 23629], // Address of variable in assignment
    ['CHANS', 23631], // Address of channel data
    ['CURCHL', 23633], // Address of information used for input and output
    ['PROG', 23635], // Address of BASIC program
    ['NXTLIN', 23637], // Address of next line in program
    ['DATADD', 23638], // Address of terminator of last DATA item
    ['E_LINE', 23641], // Address of command being type in
    ['K_CUR', 23643], // Address of cursor
    ['CH_ADD', 23645], // Address of the next character to be interpreted.
    ['X_PTR', 23647], // Address of the character after the '?' marker
    ['WORKSP', 23649], // Address of temporary work space
    ['STKBOT', 23651], // Address of bottom of calculator stack
    ['STKEND', 23653], // Address of start of spare space
    ['BREG', 23655], // Calculator's B register
    ['MEM', 23656], // Address of area used for calculator's memory
    ['FLAGS2', 23658], // More flags
    ['DF_SZ', 23659], // The number of lines in the lower part of the screen
    ['S_TOP', 23660], // The number of the top program line in automatic listings
    ['OLDPPC', 23662], // Line number to which CONTINUE jumps
    ['OSPPC', 23664], // Number within line of statement to which CONTINUE jumps
    ['FLAGX', 23665], // Various flags
    ['STRLEN', 23666], // Length of string type destination in assignment
    ['T_ADDR', 23668], // Address of next item in parameter table
    ['SEED', 23670], // The seed for RND
    ['SEED_L', 23670],
    ['SEED_H', 23671],
    ['FRAMES', 23672], // Frame counter
    ['UDG', 23675], // Address of first user defined graphic
    ['UDG_L', 23675],
    ['UDG_H', 23676],
    ['COORDS', 23677], // Coordinates of last point plotted
    ['P_POSN', 23679], // Column number of printer position
    ['PR_CC', 23680], // Address of next position for LPRINT to print at
    ['ECHO_E', 23682], // Column and line number of end of input buffer
    ['DF_CC', 23684], // Address in display file of PRINT position
    ['DF_CCL', 23686], // Like DF-CC for lower part of screen
    ['S_POSN', 23688], // Column and line numbr for PRINT position
    ['S_POSN_L', 23688],
    ['S_POSN_H', 23689],
    ['S_POSNL', 23690], // Like S_POSN for lower part of screen
    ['SCR_CT', 23692], // Scroll counter
    ['ATTR_P', 23693], // Permanent current colours
    ['MASK_P', 23694], // Used for transparent colours
    ['ATTR_T', 23695], // Temporary current colours
    ['MASK_T', 23696], // Temporary transparent colours
    ['P_FLAG', 23697], // More flags
    ['MEMBOT', 23698], // Calculator's memory area
    ['NMIADD', 23728], // Non-maskable interrupt address
    ['RAMTOP', 23730], // Address of last byte of BASIC system area
    ['P_RAMT', 23732], // Address of last byte of physical RAM
]);

/**
 * 
 * Substitute all system variables inside code.
 * For simplicity and reliability, system variables must be
 * marked between double braces.
 * 
 * System variables must be in capital letters or won't be detected.
 * 
 * ex: "PRINT POKE {{LAST_K}}"
 * 
 * @param {str} code
 * @param {bool} debug If true throw error if sysvar not exist. 
 * @returns str 
 */
export function resolveSysvars(code, debug=true) {
    const codeResolved = code.replace(/{{(.*?)}}/g, (match, key) => {
        if (sysvars.has(key.trim())) {
            return `${sysvars.get(key.trim())}`
        } else {
            if (debug) {
                throw new Error(`can't resolve system variable: ${match}`)
            } else {
                return match;
            }
        }
    });
    return codeResolved
}
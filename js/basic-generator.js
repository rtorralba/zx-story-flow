import { normalizeFileName } from './utils.js';
import { generateMucho } from './mucho-generator.js';

// Helper: Convert color name to ZX Spectrum color code (0-7)
function colorToZX(colorName) {
    const colors = {
        'black': 0, 'blue': 1, 'red': 2, 'magenta': 3,
        'green': 4, 'cyan': 5, 'yellow': 6, 'white': 7
    };
    return (colors[colorName] !== undefined) ? colors[colorName] : 0;
}

// Word-wrapping for ZX Spectrum 32-char screen
// Returns an array of lines to avoid exceeding Sinclair Basic 255-char line limit
function wrapText(text, maxWidth = 32) {
    if (!text) return [];
    const cleanText = text.replace(/"/g, "'");
    const paragraphs = cleanText.split('\n');
    const wrappedLines = [];

    paragraphs.forEach(para => {
        if (para.length === 0) {
            wrappedLines.push('');
            return;
        }

        let remaining = para;
            while (remaining.length > maxWidth) {
            let breakAt = remaining.lastIndexOf(' ', maxWidth);
            if (breakAt === -1) breakAt = maxWidth;

            wrappedLines.push(remaining.substring(0, breakAt));
            remaining = remaining.substring(breakAt);
        }
        if (remaining.length > 0) {
            wrappedLines.push(remaining);
        }
    });

    return wrappedLines;
}


/** 
 * First stage parsing.
 * Parse lines into
 * 
 * 
 */
function parseLine(line) {
    const pline = {
        type: '', // { Q | O | I | P | T | A | C }
        text: '',
    }
    const tline = line.trim();
    if(line.startsWith('$')){
        pline.type = line[1];
        const text = line.slice(2).trim().toLowerCase();
        pline.text = cleanPredicate(text);
    } else if (line.startsWith('#')){
        // A comment. 
        // Just discard it.
        return null
    } else {
        pline.type = 'T'
        pline.text = line.replace(/"/g, `""`);
    }
    return pline
}




/**
 * 
 * @param {str} text - with *only* options and commands.
 * @param {ojb} basicData - Dictionary with all data
 *      collected during transpilation. Most of this data
 *      will be required later, possibly in a second pass.
 * 
 * Return a string with BASIC code that will go in the
 * IF statemet. "IF " + string + " THEN"
 */
function transpileOptions(text,basicData) {

    var basicCode = '';

    // Flags tested for True.
    text.matchAll(/(?:^|\s)(?:has:)?([a-zA-Z0-9]+)(?=\s|$)/g)?.forEach(match=>{
        const flag = 'f'+match[1];
        basicData.flags.add(flag);
        basicCode += basicCode?" AND "+flag:flag;
    })

    // Flags tested for False.
    text.matchAll(/(?:!|not:)([a-zA-Z0-9]+)(?=\s|$)/g)?.forEach(match=>{
        const flag = 'f'+match[1];
        basicData.flags.add(flag);
        basicCode += basicCode?" AND NOT "+flag: "NOT "+flag;
    })

    // Numeric variable test
    const isNumber = (str) => str == Number.parseInt(str)
    text.matchAll(/(?:^|\s)([a-zA-Z0-9]+)(==|!=|<=|>=|<|>)([a-zA-Z0-9]+)(?=\s|$)/g)?.forEach(match=>{
        const var1 = 'i'+match[1];
        const var2 = isNumber(match[3])?match[3]:"i"+match[3];
        let op = '';
        if (match[2]==="!=") op = "<>"
        else if (match[2]==="==") op = "="
        else op=match[2]
        //const op = match[2]==="!="?"<>":match[2];
        
        // Add variables to list of variables.
        basicData.vars.add(var1);
        !isNumber(var2)?basicData.vars.add(var2):null;
        
        basicCode += basicCode?" AND ":"";
        basicCode += "(" + var1 + " " + op + " " + var2 + ")"
    })

    // Numeric variable test
    text.matchAll(/(?:^|\s)(?:rnd):([0-9]+)(?=\s|$)/g)?.forEach(match=>{
        basicCode += basicCode?" AND ":"";
        basicCode += `RND*256 < ${match[1]}`;
    })

    return basicCode
}



/**
 * 
 * @param {*} text 
 * @param {*} basicData 
 */
function transpileStatements(text,basicData) {
    
    var basicCode = '';

    // Operations with flags
    text.matchAll(/(?:^|\s)(set|reset|toggle):([a-zA-Z0-9]+)(?=\s|$)/g)?.forEach(match=>{
        const op = match[1]
        const flag = 'f'+match[2];
        basicData.flags.add(flag);

        basicCode += basicCode?":":"";
        switch(op) {
            case "set":
                basicCode += `LET ${flag}=SGN PI`;
                break;
            case "reset":
                basicCode += `LET ${flag}=NOT PI`;
                break;
            case "toggle":
                basicCode += `LET ${flag}=NOT ${flag}`;
                break;
        }
    })

    // Operations with numbers.
    const isNumber = (str) => str == Number.parseInt(str)
    text.matchAll(/(?:^|\s)([a-zA-Z0-9]+)(\+=|\-=|\+|\-|=)([a-zA-Z0-9]+)(?=\s|$)/g)?.forEach(match=>{
        const var1 = 'i'+match[1];
        const op = match[2]==="!="?"<>":match[2];
        const var2 = isNumber(match[3])?match[3]:"i"+match[3];
        basicData.vars.add(var1);
        !isNumber(var2)?basicData.vars.add(var2):null;
        
        basicCode += basicCode?":":"";
        switch(op) {
            case "=":
                basicCode += `LET ${var1} = ${var2}`;
                break;
            case "+=":
            case "+":
                basicCode += `LET ${var1} = ${var1} + ${var2}`;
                break;
            case "-=":
            case "-":
                basicCode += `LET ${var1} = ${var1} - ${var2}`;
                break;
        }
    })


    // Attribute changes.
    text.matchAll(/(?:^|\s)(attr|dattr|iattr|border):([0-9]+)(?=\s|$)/g)?.forEach(match=>{
        const op = match[1]
        const value = match[2];

        basicCode += basicCode?":":"";
        switch(op) {
            case "attr":
                basicCode += `LET tattr = ${value}:POKE 23693,tattr`;//ATTR_P
                break;
            case "dattr":
                basicCode += `LET dattr = ${value}`; // This will take effect next time divider is drawn.
                break;
            case "iattr":
                basicCode += `LET iattr = ${value}:POKE 23624,iattr`;//BORDCR
                break;
            case "border":
                basicCode += `LET battr = ${value}:OUT 254,battr`;//
                break;
        }
    })


    // Crelar Screen.
    text.matchAll(/(?:^|\s)(?:cls):([0|1|2]+)(?=\s|$)/g)?.forEach(match=>{

        basicCode += basicCode?":":"";
        switch(match[1]) {
            case "0":
                basicCode += `GO SUB [[sys_cls_all]]`;
                break;
            case "1":
                // Clear text not iplemented. Clear all instead.
                basicCode += `GO SUB [[sys_cls_all]]`;
                break;
            case "2":
                basicCode += `GO SUB [[sys_cls_interface]]`;
                break;
        }
    })
    
    
    // GO / GOSUB
    // Assume this must be always the last commands.
    text.matchAll(/(?:^|\s)(gosub|go):([a-zA-Z0-9_-]+)(?=\s|$)/g)?.forEach(match=>{

        basicCode += basicCode?":":"";
        switch(match[1]) {
            case "go":
                // Jump straight away to the page.
                // Equivalent to selecting an option pointing there: Clear screen and jump there.
                // Aborts all subroutines, at any depth, by clearing the stack
                // and GO TO line stored at i. (GO TO inside sys routine)
                basicCode += `GO SUB [[sys_cls_all]]:LET n = NOT PI:LET i=[[${match[2]}]]:GO SUB [[sys_clear_stack]]`
                // // In this simpler alternative, If this is not a final screen, 
                // // it will leave values in the gosub stack.
                // basicCode += `GO SUB [[sys_cls_all]]:LET n = NOT PI:LET gsc = NOT PI:GO TO [[${match[2]}]]`
                break
            case "gosub":
                // Jumps to the page without clearing screen.
                // We jump with a BASIC GO SUB, so that we can return.
                // increase gsc. Here, we allow for multiple depth levels of
                // GOSUB, as opposed to the original MuCho.
                // !!!! Current gosub is executed instantly. In MuCho, it
                // !!!! Prints at the end, after printing any text the $O
                // !!!! Block might contain.
                basicCode += `LET gsc=gsc+1:GO SUB [[${match[2]}]]`
                break
        }
    })

    return basicCode;

}

/**
 * Remove spaces around operators and :
 * This makes processing more tolerant to
 * unnecessary spaces introduced by the user
 * and that can be safely removed.
 * MuCho might not accpet these spaces.
 * 
 * @param {*} text 
 * @param {*} basicData 
 * @returns 
 */
function cleanPredicate(text,basicData) {
    const result = text.replace(/\s*(==|!=|<=|>=|<|>|\+|-|:)\s*/g, (match, op) => {
        return op;
    })
    return result;
}



function addBASICSystemCode(basicData, globalConfig) {

    let sysCode = "";
    
    // Initialization code.
    // =========================================================
    // ONE-TIME IMAGE INIT (lines 1-2, renumbered to 10-20)
    // Using loader, frees memory and wait for a key.
    // =========================================================
    // sysCode += `
    // 1 REM = one-time init =
    // 2 PRINT #1;AT 1,11;FLASH 1;"PRESS STOP";:PAUSE 1:PAUSE 0:CLEAR 65367: GO TO [[sys_start_game]]
    // `;
    sysCode += `
    1 REM = one-time init =
    2 PRINT #1;AT 1,11;FLASH 1;"PRESS STOP";:PAUSE 1:PAUSE 0:GO TO [[sys_start_game]]
    `;
   
    // Code to launch interactive selecction of option
    // This is kept closest to the start to improve key scan loop the fastest.
    // IMPORTANT! This is not a subroutine. Execution must be diverted here
    // with a goto, as we will jump to the select screen with a goto.
    //11 IF gsc THEN LET gsc=gsc-1:RETURN
    basicData.labels["sys_choose_option"] = 10;
    basicData.labels["sys_choose_option_loop"] = 14;
    sysCode += `
    10 REM choose an option
    11 IF gsc AND n THEN PRINT "THIS SCR IS NOT SUBROUTINE!":STOP
    12 IF gsc THEN LET gsc=gsc-1:RETURN
    13 LET i=1:IF NOT n THEN GO SUB [[sys_cls_interface]]:PRINT #1;"     PULSA CUALQUIER TECLA"'"      PARA JUGAR DE NUEVO":PAUSE 1:PAUSE 0:GO TO [[sys_start_game]]:
    14 PRINT #1;AT i,1;"{B}";:PAUSE 1:PAUSE 0:LET k=PEEK 23560:PRINT #1;AT i,1;" ";
    15 IF k=10 THEN LET i=i+1-(n AND i=n)
    16 IF k=11 THEN LET i=i-1+(n AND i=1)
    17 IF k=13 THEN GO SUB [[sys_cls_all]]:LET n = NOT PI:GO TO p(i)
    18 GO TO [[sys_choose_option_loop]]
    `;
   
    

    // Load image from RAMdisk
    basicData.labels["sys_load_image"] = 20;
    sysCode += `
    20 REM Load i$ from RAMDISK
    21 IF 1 = PEEK 23312 THEN LOAD "M:"+i$ CODE 16384:RETURN
    22 LOAD! i$ CODE 16384:RETURN
    `
    
    // Routine to clean all.
    // Notice it continues to sys_cls_interface.
    basicData.labels["sys_cls_all"] = 30;
    sysCode += `
    30 REM New screen. CLS + option bar (no image)
    31 RANDOMIZE:POKE 23624,tattr:POKE 23659,2:CLS:RETURN
    `;
    
    // Routine to clean the interface (options) section.
    basicData.labels["sys_cls_interface"] = 40;
    sysCode += `
    40 REM Option bar subroutine (also called after image load)
    41 POKE 23624,dattr:POKE 23659,1:PRINT #1;AT 0,0;"{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}":POKE 23624,iattr:LET n=0:RETURN
    `

    // =========================================================
    // START A NEW GAME.
    // System variables:
    // - tattr : text attribute.
    // - dattr : divider attribute.
    // - iattr : interface attribute.
    // - gsc : gosub depth counter.
    // - n : number of options in the interface.
    // - i : aux variable. used for controllin goption selection
    //       during user interaction.
    // =========================================================
    const globalBorder = colorToZX(globalConfig?.border || 'black');
    basicData.labels["sys_start_game"] = 50;
    sysCode += `
    50 REM = init global =
    51 POKE 23693,7:OUT 254,${globalBorder}:CLEAR
    52 REM p() table of line pointers.
    53 DIM p(10):LET n=0:LET i=0:LET tattr=7:LET dattr=7:LET iattr=7:LET gsc=0
    54 REM Inicializa variables del juego.
    `;

    // Initialise all flags and variables to 0 on a single line
    if (basicData.flags.size || basicData.vars.size) {
        sysCode += `55 LET ` 
        sysCode += [...basicData.flags].map(f => `${f}=0`).join(':LET ');
        sysCode += basicData.flags.size && basicData.vars.size?":LET ":"";
        sysCode += [...basicData.vars].map(f => `${f}=0`).join(':LET ');
        sysCode += "\n";
    } else {
        sysCode += `55 REM no flags nor numeric variables\n`;
    }
    sysCode += `56 GO TO 100`;

    // Add new option making sure that when the
    // first option is added, divider is drawn and interface colors configured.
    basicData.labels["sys_new_option"] = 60;
    sysCode += `
    60 REM Add new option.
    61 IF NOT n THEN GO SUB [[sys_cls_interface]]
    62 LET n = n + SGN PI:RETURN 
    `

    // Clear GO SUB stack and jump to line contained at "i"
    // Notice can't return because stack was cleared.
    // Store some data temporarily at TVDATA and SEED
    basicData.labels["sys_clear_stack"] = 70;
    sysCode += `
    70 REM Clear GOSUB stack.
    71 RANDOMIZE PEEK 23641 + 256*PEEK 23642 - 1 
    72 POKE 23566,PEEK 23627: POKE 23567,PEEK 23628
    73 POKE 23627,PEEK 23670: POKE 23628,PEEK 23671
    74 CLEAR
    75 POKE 23627,PEEK 23566: POKE 23628,PEEK 23567
    76 LET gsc=0: GO TO i
    `

    return sysCode;
}


/**
 * Split a list of preparsed mucho lines into Q$ blocks. 
 */
function splitIntoScreenBlocks(muchoLines) {
   
    let currentBlock = []
    let blocks = []

    muchoLines.forEach(line => {
        if (line.type==='Q') {
            currentBlock = [];
            blocks.push(currentBlock);
        };
        currentBlock.push(line)
    });

    return blocks;

}


/**
 * Transpiles MuCho code into ZX Basic
 */
function transpileMuchoBlock(basicData, muchoCode) {

    let screenName = ''; // Store the screen name.
    let delayed_options = [];
    let option_counter = 0;

    // A state variable to control how to process
    // text lines.
    // 'text' -> expecting text for the screen.
    // 'option' -> expecting text line for an option.
    // '' -> Not expecting text. Will be ignored.
    let state = '';
    // Text printing algorithm tries to end prints with ";", so that
    // you can use up to last line without triggering scroll.
    // This tends to accidentally concatenate lines, without CR,
    // This flag makes sure "'" is inserted when needed if
    // another text line is inserted. 
    let force_cr = false;
    let last_pline = {}; 


    muchoCode.forEach(pline => {
        if (pline.type==="Q") {
            state = 'text';
            basicData.start_new_line();
            // Reference new screen.
            const match = pline.text.match(/([a-zA-Z0-9]+)(.*)?$/);
            screenName = match[1]
            basicData.labels[screenName] = basicData.lineNo;
            basicData.editLine += `REM ${screenName}`;
            
            basicData.start_new_line();
            //basicData.editLine += "GO SUB [[sys_cls_interface]]"
            // Additional statements.
            if (match[2]) {
                const opsCode = transpileOptions(match[2],basicData);
                const stmCode = transpileStatements(match[2],basicData);
                basicData.editLine += opsCode?"IF " + opsCode + " THEN ":"";
                basicData.editLine += stmCode;
                if (opsCode) basicData.finish_line();
                //basicData.editLine += ":"+transpileStatements(match[2],basicData);
            }
        } else if (pline.type==="O") {
            // Next text should start in a new line.
            force_cr = true;
            // Start an optional text block.
            basicData.start_new_line();
            // Add code to the line.
            const opsCode = transpileOptions(pline.text,basicData);
            const stmCode = transpileStatements(pline.text,basicData);
            basicData.editLine += opsCode?"IF " + opsCode + " THEN ":"";
            basicData.editLine += stmCode;
        } else if (pline.type==="T") {
            if (state==='text') {
                if (last_pline.type==="T" || last_pline.type==="P"){
                    // Already an ongoing print.
                    // Discard ending ;
                    if (basicData.editLine.at(-1)===';') basicData.editLine = basicData.editLine.slice(0,-1);
                    basicData.editLine += pline.text?`'"${pline.text}";`:`'`;
                } else {
                    // Need to start a new PRINT statement.
                    basicData.start_new_statement();
                    basicData.editLine += "PRINT ";
                    if (force_cr) basicData.editLine += "'";
                    basicData.editLine += pline.text?`"${pline.text}";`:`;`;
                    //basicData.editLine += pline.text?`PRINT "${pline.text}";`:`PRINT ;`;
                }
            } else if (state=='option') {
                if (pline.text) {
                    basicData.start_new_statement()
                    basicData.editLine += `PRINT #1;"   ${pline.text}"`;
                    state = ''; 
                }
            } else {
                // A text line in a wrong position -> ignored..
                // !!!! Consider throwing an exception.
            }
        } else if (pline.type==="P") {
            if (state==='text') {
                if (last_pline.type==="T" || last_pline.type==="P"){
                    // Already an ongoing print. 
                    // Discard ending ;
                    if (basicData.editLine.at(-1)===';') basicData.editLine = basicData.editLine.slice(0,-1);
                    basicData.editLine += `'`;
                } else {
                    // Need to start a new PRINT statement.
                    basicData.start_new_statement();
                    basicData.editLine += `PRINT ';`;
                }
            }
        } else if (pline.type=="I") {
            const match = pline.text.match(/^([^ ]+)\s*(.*)$/);
            const imgFile = match[1];
            const ops =  match[2]?match[2]:"";


            //const imgName = imgFile.replace(/\.scr$/i, '').replace(/\.[^.]+$/, '');
            const imgName = normalizeFileName(imgFile);
            
            basicData.start_new_line();
            const opsCode = transpileOptions(ops,basicData);
            const stmCode = transpileStatements(ops,basicData);
            basicData.editLine += opsCode?"IF " + opsCode + " THEN ":"";
            // Assumes images are the first element of screen.
            // Makes sure attributes of image are the current ones configured for text.
            basicData.editLine += `PRINT OVER 1;AT 0,0,,,,,,,,,,,,,,,,:LET i$="${imgName}":GO SUB [[sys_load_image]]:`;
            basicData.editLine += stmCode?`:${stmCode}`:``;
            basicData.finish_line();
        } else if (pline.type==="A") {
            state = 'option';
            option_counter++;

            const match = pline.text.match(/([a-zA-Z0-9]+)(.*)?$/);
            const destScreen = match[1];
            const ops =  match[2]?match[2]:"";
            const opsCode = transpileOptions(ops,basicData);
            const stmCode = transpileStatements(ops,basicData);

            basicData.start_new_line();
            basicData.editLine += opsCode? `IF ${opsCode} THEN `:``;
            //basicData.editLine += `LET n = n + 1`;
            basicData.editLine += `GO SUB [[sys_new_option]]`;
            if (stmCode) {
                // Have statements to run when selected. Need to resolve at
                // the end of screen block.
                const label = `${screenName}_OP${option_counter}`;
                basicData.editLine += `:LET p(n) = [[${label}]]`;
                delayed_options.push({label: label, code: stmCode, dest: destScreen})
            } else {
                // No statements associated to option. Can resolve in a single line.
                basicData.editLine += `:LET p(n) = [[${destScreen}]]` ;
            }
        } else {
            // Don't know what to do.
            // at the moment. Just ignore.
            return;
        };
        last_pline = pline;
    });

    // flush last line.
    basicData.finish_line();

    // if (!option_counter) {
    //     // No options. It can be a subroutine or end.
    //     basicData.add_line('IF gsc THEN LET gsc=gsc-1:RETURN');
    //     basicData.finish_line();
    // }
    
    // Launch option selector.
    basicData.add_line('GO TO [[sys_choose_option]]');

    // Process the delayed statements for options.
    delayed_options.forEach(({label,code,dest}) => {
        basicData.start_new_line();
        basicData.labels[label] = basicData.lineNo;
        basicData.editLine += `REM ${label}`;
        basicData.start_new_line();
        basicData.editLine += code + `:GO TO [[${dest}]]`;
    })

    basicData.finish_line();

}


/**
 * Transpiles MuCho code into ZX Basic
 */
function transpileMuchoToBasic(muchoCode, globalConfig = null) {
    
    
    // This object contain the  BASIC code,
    // some data collected during transpilation about the program,
    // and some utility functions.  
    const basicData = {
        code : "",
        editLine : '', // Current line being edited.
        lineNo : 100, // Contain current line number being editted.
                      // If line closed, contain line number of next
                      // line being created.
        lineInc : 1, // default line increment.
        
        flags : new Set(),
        vars : new Set(),
        labels : {}, // {name, line}

        // Utility function to start editting a new line.
        start_new_line() {
            this.finish_line();
            //this.editLine = `${this.lineNo} `;
        },

        // Utility function to start a new statement.
        // Starts a new line if needed.
        start_new_statement() {
            if(!this.editLine) {
                // No line being editted, starting a new line.
                // need do nothing.
                //this.lineNo = this.lineNo + this.lineInc;
                //this.editLine = `${this.lineNo} `;
            } else if (this.editLine.slice(-1) !== ":") {
                // Line being editted, append new statement.
                // Does not check this will be the first statement
                // of line of after THEN.
                // In that cases no need to add :, but it is
                // always safe to addit.
                this.editLine += ":";
            }
        },

        // Finish  last line being editted. If any.
        finish_line() {
            if (this.editLine) {
                this.code += `${this.lineNo} ${this.editLine}\n`;
                this.editLine = "";
                this.lineNo += this.lineInc;
            }
        },

        // Safely adds a new complete basic line with code.
        add_line(linecontent) {
            this.start_new_line();
            this.editLine += linecontent;
            this.finish_line();
        },
    }


   
    // Process muchoCode by lines.
    const lines = muchoCode.trim().split(/\r?\n/);
    
    // pre-parse all lines.
    const plines = lines.flatMap(line => {
        const p = parseLine(line);
        if (p) return [p];
        return [];
    })

    // Process mucho code by Q blocks.
    const blocks = splitIntoScreenBlocks(plines);
    blocks.forEach(block => {
        transpileMuchoBlock(basicData, block);
    })


    const sysCode = addBASICSystemCode(basicData, globalConfig);

    basicData.code =  sysCode + basicData.code;


    // Fix some characters.
    basicData.code = basicData.code.replaceAll("©","{(c)}");

    // Resolve variables.
    const codeFixedLabels = basicData.code.replace(/<<(.*?)>>/g, (match, key) => {
        const variable = "i"+key;
        if (basicData.vars.has(variable)) {
            return `";${variable};"`
        } else {
            throw new Error(`can't resolve label: ${match}`)
        }
    });
    basicData.code = codeFixedLabels;


    // Resolve labels.
    const result = basicData.code.replace(/\[\[(.*?)\]\]/g, (match, key) => {
        if (key in basicData.labels) {
            return basicData.labels[key]
        } else {
            throw new Error(`can't resolve label: ${match}`)
        }
    });
    basicData.code = result;


    console.log(basicData.code);
    return basicData.code
}

// /**
//  * Transpiles MuCho code into ZX Basic following the flow3.zx.bas pattern:
//  * cursor-based option selection with p() jump table and system subroutines.
//  */
// function transpileMuchoToBasic_(muchoCode, globalConfig = null) {
//     if (!muchoCode) return "10 REM Project is empty";

//     const lines = muchoCode.split(/\r?\n/);
//     const blocks = [];
//     let currentBlock = null;

//     // Phase 1: Split into screen blocks
//     lines.forEach(line => {
//         if (line.startsWith('$Q ')) {
//             currentBlock = { header: line, content: [], options: [] };
//             blocks.push(currentBlock);
//         } else if (currentBlock) {
//             if (line.startsWith('$A ')) {
//                 currentBlock.options.push({ header: line, text: null });
//             } else if (currentBlock.options.length > 0 && currentBlock.options[currentBlock.options.length - 1].text === null) {
//                 currentBlock.options[currentBlock.options.length - 1].text = line || "Continuar";
//             } else {
//                 currentBlock.content.push(line);
//             }
//         }
//     });

//     if (blocks.length === 0) return "10 REM No screens found in MuCho code";

//     // Phase 2: Collect all flag names used anywhere
//     const allFlags = new Set();
//     muchoCode.match(/(?:set:|clear:|clr:|toggle:|has:|not:|!)([a-zA-Z0-9_]+)/g)?.forEach(match => {
//         const name = match.split(':')[1] || match.substring(1);
//         if (name !== 'border') allFlags.add(name); // Exclude border from normal flags
//     });

//     // Phase 3: Map labels to line numbers (1000 per block, max ~9 screens before 9988)
//     const labelLines = {};
//     blocks.forEach((block, idx) => {
//         const match = block.header.match(/^\$Q\s+([^\s]+)/);
//         const label = match ? match[1] : null;
//         if (label) {
//             labelLines[label.toLowerCase()] = 1000 + (idx * 1000);
//         }
//     });

//     // Phase 4: Extract default attributes from the first block header
//     const firstHeader = blocks[0].header;
//     const defaultTattr = parseInt(firstHeader.match(/attr:(\d+)/)?.[1] || "15");
//     const defaultDattr = parseInt(firstHeader.match(/dattr:(\d+)/)?.[1] || "11");
//     const defaultIattr = parseInt(firstHeader.match(/iattr:(\d+)/)?.[1] || "24");

//     const firstMatch = blocks[0].header.match(/^\$Q\s+([^\s]+)/);
//     const startLabel = firstMatch ? firstMatch[1].toLowerCase() : "start";

//     let basicCode = "";

//     // =========================================================
//     // ONE-TIME IMAGE INIT (lines 1-2, renumbered to 10-20)
//     // Using loader, frees memory and wait for a key.
//     // =========================================================
//     basicCode += `1 REM = one-time init =\n`;
//     basicCode += `2 PRINT #1;AT 1,11;FLASH 1;"PRESS STOP";:PAUSE 1:PAUSE 0:CLEAR 65367\n`;

//     // =========================================================
//     // GLOBAL INIT  (lines 10 – 120)
//     // =========================================================
//     basicCode += `10 REM = init global =\n`;
//     const globalBorder = colorToZX(globalConfig?.border || 'black');
//     basicCode += `20 POKE 23693,0:BORDER ${globalBorder}:CLS\n`;
//     basicCode += `30 REM p() table of line pointers.\n`;
//     basicCode += `40 DIM p(10)\n`;
//     basicCode += `50 REM Inicializa variables del juego.\n`;

//     // Initialise all flags to 0 on a single line
//     if (allFlags.size > 0) {
//         basicCode += `60 LET ` + [...allFlags].map(f => `f${f}=0`).join(':LET ') + `:\n`;
//     } else {
//         basicCode += `60 REM no flags\n`;
//     }


//     basicCode += `90 REM Va a primera pantalla\n`;
//     basicCode += `100 GO SUB 110:GO TO ${labelLines[startLabel] || 1000}\n`;
//     basicCode += `110 REM Set default attributes\n`;
//     basicCode += `120 LET tattr=${defaultTattr}:LET dattr=${defaultDattr}:LET iattr=${defaultIattr}:RETURN\n`;

//     // =========================================================
//     // SCREEN BLOCKS
//     // =========================================================
//     blocks.forEach((block, idx) => {
//         const match = block.header.match(/^\$Q\s+([^\s]+)/);
//         const blockLabel = match ? match[1] : "Screen" + idx;
//         const baseLineNr = labelLines[blockLabel.toLowerCase()] || (1000 + idx * 1000);
//         const header = block.header;

//         // Parse attributes for this screen
//         const tattr = parseInt(header.match(/attr:(\d+)/)?.[1] || defaultTattr);
//         const dattr = parseInt(header.match(/dattr:(\d+)/)?.[1] || defaultDattr);
//         const iattr = parseInt(header.match(/iattr:(\d+)/)?.[1] || defaultIattr);
//         const hasCustomAttr = (tattr !== defaultTattr || dattr !== defaultDattr || iattr !== defaultIattr);
//         const borderMatch = header.match(/border:(\d+)/);

//         let lineNr = baseLineNr;

//         // Pre-scan block content for $I image directives
//         const blockImages = [];
//         block.content.forEach(line => {
//             if (line.startsWith('$I ')) {
//                 const imgName = line.substring(3).trim().replace(/\.scr$/i, '').replace(/\.[^.]+$/, '');
//                 if (imgName) blockImages.push(imgName);
//             }
//         });
//         const hasBlockImages = blockImages.length > 0;

//         basicCode += `${lineNr} REM-- - ${blockLabel} ---\n`;
//         lineNr += 10;

//         if (borderMatch) {
//             basicCode += `${lineNr} BORDER ${borderMatch[1]} \n`;
//             lineNr += 10;
//         }

//         // For screens with images: use 9990 (CLS only), then LOAD!/PRINT, then GO SUB 9985 (option bar).
//         // For screens without images: use 9988 (CLS + option bar in one call).
//         if (hasCustomAttr) {
//             basicCode += `${lineNr} LET tattr=${tattr}:LET dattr=${dattr}:LET iattr=${iattr}:GO SUB ${hasBlockImages ? 9990 : 9988}:\n`;
//         } else {
//             basicCode += `${lineNr} GO SUB ${hasBlockImages ? 9990 : 9988}:\n`;
//         }
//         lineNr += 10;

//         // NOTE: image loads will be emitted inline where $I appears in the content
//         // (we still use hasBlockImages to decide which subroutine to call above).

//         // --- Content lines ---
//         // First, group lines into paragraphs for proper block handling
//         const paragraphs = [];
//         let currentPara = [];
//         let pendingCommand = null;

//         for (let i = 0; i < block.content.length; i++) {
//             const line = block.content[i];
//             const trimmed = line;

//             if (trimmed === "" || trimmed === "$P") {
//                 if (currentPara.length > 0) {
//                     paragraphs.push({ type: 'text', lines: currentPara, command: pendingCommand });
//                     currentPara = [];
//                     pendingCommand = null;
//                 }
//                 paragraphs.push({ type: 'empty' });
//             } else if (trimmed.startsWith('$I ')) {
//                 // Emit an image placeholder at this position (will generate LOAD! inline)
//                 const imgName = trimmed.substring(3).replace(/\.scr$/i, '').replace(/\.[^.]+$/, '');
//                 if (currentPara.length > 0) {
//                     paragraphs.push({ type: 'text', lines: currentPara, command: pendingCommand });
//                     currentPara = [];
//                     pendingCommand = null;
//                 }
//                 paragraphs.push({ type: 'image', name: imgName });
//             } else if (trimmed.startsWith('$O ')) {
//                 if (currentPara.length > 0) {
//                     paragraphs.push({ type: 'text', lines: currentPara, command: pendingCommand });
//                     currentPara = [];
//                 }
//                 pendingCommand = trimmed;
//             } else if (trimmed.startsWith('$')) {
//                 // Other commands, flush paragraph if any
//                 if (currentPara.length > 0) {
//                     paragraphs.push({ type: 'text', lines: currentPara, command: pendingCommand });
//                     currentPara = [];
//                     pendingCommand = null;
//                 }
//             } else {
//                 currentPara.push(line);
//             }
//         }
//         if (currentPara.length > 0) {
//             paragraphs.push({ type: 'text', lines: currentPara, command: pendingCommand });
//         }

//         // Now generate BASIC for each paragraph
//         const lastTextParaIdx = paragraphs.map((p, i) => p.type === 'text' ? i : -1).reduce((max, i) => Math.max(max, i), -1);
//         const lastContentIdx = paragraphs.map((p, i) => (p.type === 'text' || p.type === 'image') ? i : -1).reduce((max, i) => Math.max(max, i), -1);

//         paragraphs.forEach((para, pIdx) => {
//             if (para.type === 'empty') {
//                 // Avoid emitting trailing empty PRINTs: only print empty lines
//                 // if there is content afterwards on the screen.
//                 if (pIdx < lastContentIdx) {
//                     basicCode += `${lineNr} PRINT ""\n`;
//                     lineNr += 10;
//                 }
//             } else if (para.type === 'image') {
//                 const nm = (para.name || '').toUpperCase();
//                 //basicCode += `${lineNr} LOAD! "${nm}" CODE 16384\n`;
//                 basicCode += `${lineNr} LET i$="${nm}":GO SUB 9982\n`;
//                 lineNr += 10;
//             } else if (para.type === 'text') {
//                 const fullText = para.lines.join('\n');
//                 const wrappedLines = wrapText(fullText);

//                 if (wrappedLines.length > 0) {
//                     const isLastPrint = (pIdx === lastTextParaIdx);
//                     const semicolon = isLastPrint ? ";" : "";
//                     // Ensure we emit all wrapped lines with a single PRINT using commas
//                     const sanitized = wrappedLines.map(s => s.replace(/"/g, "'"));
//                     // Use the BASIC carriage-return marker the project expects: single-quote '\'' between strings
//                     const combinedPrint = sanitized.map(s => `"${s}"`).join("' ");

//                     if (para.command && para.command.startsWith('$O ')) {
//                         const condStr = para.command.substring(3);
//                         const conditions = condStr.split(' AND ').map(p => {
//                             const c = p.trim();
//                             if (c.startsWith('has:')) return `f${c.split(':')[1]}=1`;
//                             if (c.startsWith('not:') || c.startsWith('!')) {
//                                 const f = c.includes(':') ? c.split(':')[1] : c.substring(1);
//                                 return `f${f}=0`;
//                             }
//                             return c;
//                         });
//                         basicCode += `${lineNr} IF ${conditions.join(' AND ')} THEN PRINT ${combinedPrint}${semicolon}\n`;
//                     } else {
//                         basicCode += `${lineNr} PRINT ${combinedPrint}${semicolon}\n`;
//                     }
//                     lineNr += 10;
//                 }
//             }
//         });

//                 // If this screen uses images we called CLS only (9990).
//                 // After all inline LOAD!s the option bar needs to be redrawn.
//                 if (hasBlockImages) {
//                     basicCode += `${lineNr} GO SUB 9985\n`;
//                     lineNr += 10;
//                 }

//                 // --- Parse options: separate conditions (has:/not:) from actions (set:/clear:/toggle:) ---
//         const effectiveOptions = block.options.length > 0
//             ? block.options
//             : [{ header: `$A ${startLabel}`, text: "Jugar de nuevo" }];

//         // Action blocks will be placed at baseLineNr + 500 onward (safe gap after content)
//         const actionBlockBase = baseLineNr + 500;

//         const parsedOptions = effectiveOptions.map((opt, optIdx) => {
//             const parts = opt.header.split(/\s+/);
//             const targetLabelRaw = parts[1] || "";
//             const targetLine = labelLines[targetLabelRaw.toLowerCase()] || baseLineNr;
//             const tokens = parts.slice(2);

//             const conditions = [];
//             const actions = [];

//             tokens.forEach(tok => {
//                 const [verb, name] = tok.split(':');
//                 if (!name) return;

//                 // Handle border action specifically
//                 if (verb === 'border') {
//                     actions.push(`BORDER ${name}`);
//                     return;
//                 }

//                 if (verb === 'has') conditions.push(`f${name}=1`);
//                 else if (verb === 'not') conditions.push(`f${name}=0`);
//                 else if (verb === 'set') actions.push(`LET f${name}=1`);
//                 else if (verb === 'clear' || verb === 'clr') actions.push(`LET f${name}=0`);
//                 else if (verb === 'toggle') actions.push(`LET f${name}=1-f${name}`);
//             });

//             const needsActionBlock = actions.length > 0;
//             const actionLine = needsActionBlock ? actionBlockBase + (optIdx * 20) : null;
//             const jumpTarget = needsActionBlock ? actionLine : targetLine;

//             return {
//                 targetLine, conditions, actions, needsActionBlock, actionLine,
//                 jumpTarget, text: opt.text || "Continuar"
//             };
//         });

//         // --- Option display lines (fill p() table, PRINT #1 for the menu area) ---
//         parsedOptions.forEach(opt => {
//             const safeText = (opt.text || "Continuar").replace(/"/g, "'").substring(0, 28);
//             const condPart = opt.conditions.length > 0
//                 ? `IF ${opt.conditions.join(' AND ')} THEN ` : '';
//             basicCode += `${lineNr} ${condPart}LET n=n+1:LET p(n)=${opt.jumpTarget}:PRINT #1;"   ${safeText}"\n`;
//             lineNr += 10;
//         });

//         // Hand control to the cursor-selection loop
//         basicCode += `${lineNr} GO TO 9993\n`;
//         lineNr += 10;

//         // --- Action blocks: set flags then jump to target ---
//         // These live at actionBlockBase + optIdx*20 within this screen's number range
//         parsedOptions.forEach((opt, optIdx) => {
//             if (opt.needsActionBlock) {
//                 const ab = opt.actionLine;
//                 const safeComment = (opt.text || "option").replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 30);
//                 basicCode += `${ab} REM ${safeComment}\n`;
//                 basicCode += `${ab + 10} ${opt.actions.join(':')}:GO TO ${opt.targetLine}\n`;
//             }
//         });
//     });

//     // =========================================================
//     // SYSTEM SUBROUTINES  (9988 – 9999)
//     // Identical in structure to flow3.zx.bas
//     // =========================================================
//     basicCode += `
//     9982 REM Load i$ from RAMDISK
//     9983 IF 1 = PEEK 23312 THEN LOAD "M:"+i$ CODE 16384:RETURN
//     9984 LOAD! i$ CODE 16384:RETURN
//     `
//     basicCode += `9985 REM Option bar subroutine (also called after image load).\n`;
//     basicCode += `9986 POKE 23624,dattr:POKE 23659,1:PRINT #1;AT 0,0;"{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}":POKE 23624,iattr:LET n=0:LET i=1:RETURN\n`;
//     basicCode += `9988 REM New screen. CLS + option bar (no image).\n`;
//     basicCode += `9989 POKE 23693,tattr:POKE 23624,dattr:CLS:GO SUB 9985:RETURN\n`;
//     basicCode += `9990 REM New screen. CLS only (image will follow).\n`;
//     basicCode += `9991 POKE 23693,tattr:POKE 23624,dattr:CLS:RETURN\n`;
//     basicCode += `9993 REM choose an option\n`;
//     basicCode += `9994 IF NOT n THEN PRINT #1;"  FIN  -  PRESS ANY KEY":PAUSE 1:PAUSE 0:GO TO 0:\n`;
//     basicCode += `9995 PRINT #1;AT i,1;"{B}";:PAUSE 1:PAUSE 0:LET k=PEEK 23560:PRINT #1;AT i,1;" ";:\n`;
//     basicCode += `9996 IF k=10 THEN LET i=i+1-(n AND i=n)\n`;
//     basicCode += `9997 IF k=11 THEN LET i=i-1+(n AND i=1)\n`;
//     basicCode += `9998 IF k=13 THEN GO SUB 110:GO TO p(i)\n`;
//     basicCode += `9999 GO TO 9993\n`;

//     return basicCode;
// }

/**
 * Renumbers BASIC lines safely starting from 10, incrementing by 10.
 * Preserves the system subroutines at 9988-9999.
 */
function renumberBasic(basicCode) {
    const lines = basicCode.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) return basicCode;

    const oldToNew = {};
    let nextNum = 10;

    // Pass 1: generate mapping
    lines.forEach(line => {
        const match = line.match(/^(\d+)/);
        if (match) {
            const oldNum = parseInt(match[1]);
            if (oldNum >= 9985 && oldNum <= 9999) {
                // Keep system routines where they are
                oldToNew[oldNum] = oldNum;
            } else {
                oldToNew[oldNum] = nextNum;
                nextNum += 10;
            }
        }
    });

    // Pass 2: apply mapping to line numbers and references:
    // References can be like: GO TO 1000, GO SUB 110, p(n)=2000
    const processedLines = lines.map(line => {
        // Change the line number itself
        let newLine = line.replace(/^(\d+)/, (match, p1) => {
            const oldNum = parseInt(p1);
            return oldToNew[oldNum] ? oldToNew[oldNum] : oldNum;
        });

        // Replace GO TO, GO SUB, RESTORE, RUN, etc. targets
        // Note: carefully skipping PEEK, POKE, which might look like commands with numbers but aren't line pointers.
        newLine = newLine.replace(/(GO\s+TO|GO\s+SUB|GOTO|GOSUB|RESTORE|RUN)\s+(\d+)/gi, (match, cmd, numStr) => {
            const num = parseInt(numStr);
            if (oldToNew[num]) {
                return `${cmd} ${oldToNew[num]}`;
            }
            return match;
        });

        // Replace dynamic pointers assigned to the p() array (e.g. LET p(n)=2000)
        newLine = newLine.replace(/(p\([\w\d]+\)=)(\d+)/gi, (match, assignment, numStr) => {
            const num = parseInt(numStr);
            if (oldToNew[num]) {
                return `${assignment}${oldToNew[num]}`;
            }
            return match;
        });

        return newLine;
    });

    return processedLines.join('\n') + '\n';
}



export function collectImageNamesFromMucho(muchoText) {
    // Collect unique image set of used Image Names
    // from $I directives in the generated MuCho text
    // Imagenames are collected in lowercase.
   
    const imageNameSet = new Set();
    
    (muchoText.match(/\$I\s+([^\s\n]+)/g) || []).forEach(m => {
        const nm = normalizeFileName(m.split(/\s+/)[1]);
        if (nm) imageNameSet.add(nm);
    });
    const imageNames = [...imageNameSet];

    return imageNames
}


export function generateLoaderFromMucho(muchoText, screenImages, globalConfig = null) {
   
    // Get list of images from Mucho.
    const muchoImageNames = collectImageNamesFromMucho(muchoText);


    // Get list of images from nodes that are in mucho Images.
    const nodeImageNames = []
    screenImages.forEach(img => {
        // !!!! Probably no need to remove extension.
        //let screenName = img.name.toLowerCase().replace(/\.scr$/i, '');
        let screenName = normalizeFileName(img.name);
        // Check in mucho Images.
        if (muchoImageNames.find(name => name === screenName)) {
            nodeImageNames.push(screenName);
        }
    })

    // Check that all mucho images are in nodeImageNames.
    muchoImageNames.forEach(name => {
        if (!nodeImageNames.find(nodename => nodename === name)) {
            throw new Error(`Missin image ${name}`); 
        }
    })

    // Generate a loader
    const loaderBasic = generateBasicLoader(globalConfig, nodeImageNames);

    return loaderBasic
}


export function generateBasicFromMucho(muchoText, globalConfig = null) {

    // Transpile MuCho to ZX Basic (image names drive the one-time init preamble)
    const rawBasic = transpileMuchoToBasic(muchoText, globalConfig);
    
    // Renumber lines compactly to free up space
    //const gameBasic = renumberBasic(rawBasic)
    const gameBasic = rawBasic;

    return gameBasic;
}


export function getDefaultUDGs(globalConfig){
    // Get UDGs from globalConfig or use defaults

    let udgA = ["00000000", "00010000", "00111000", "01111100", "11111110", "11111111", "11111111", "11111111"]; // Default arrow (A)
    let udgB = ["00000000", "10001000", "11001100", "11101110", "11001100", "10001000", "00000000", "00000000"]; // Default cursor (B)

    if (globalConfig && globalConfig.basicGraphics) {
        if (globalConfig.basicGraphics.separator) {
            udgA = [];
            for (let i = 0; i < 8; i++) {
                let row = "";
                for (let j = 0; j < 8; j++) {
                    row += globalConfig.basicGraphics.separator[i * 8 + j] ? "1" : "0";
                }
                udgA.push(row);
            }
        }
        if (globalConfig.basicGraphics.selector) {
            udgB = [];
            for (let i = 0; i < 8; i++) {
                let row = "";
                for (let j = 0; j < 8; j++) {
                    row += globalConfig.basicGraphics.selector[i * 8 + j] ? "1" : "0";
                }
                udgB.push(row);
            }
        }
    }

    return [udgA,udgB]
}

export function generateBasicLoader(globalConfig, imageNames){

    let basicCode = "";
    basicCode += `
    10 CLEAR:INK 0:PAPER 7:BORDER 7:CLS:PRINT"\xA4"
    20 IF SCREEN$(0,0)="U" THEN GO TO 50
    30 REM Case 128k BASIC
    40 GO TO 100`

    basicCode += `
    50 REM Case 40k BASIC
    60 CLS:BEEP 1/10,20:BEEP 1/10,20:BEEP 1/10,20
    70 PRINT FLASH 1;"PARA LA CINTA"
    80 PRINT "Este juego requiere un spectrum 128k/+2/+2a/+3"
    90 GO TO 90`
    
    basicCode += `
    100 REM ** 128k model. Load game. **
    110 BORDER 0:PAPER 0:INK 0:CLS
    120 CLEAR 58455
    130 REM Disable load prompt.
    140 POKE 23739,111
    150 REM Config GDU
    160 GO SUB 1000
    `


    // Loading screen.
    if (globalConfig.loadingScreen) {
        basicCode += `180 LOAD "SCREEN" SCREEN$\n`
    }

    // Load assets for the game.
    // Expected image sizes.
    // 6912 -> full screen with attributes.
    // 6144 -> full screen BW
    // 4096 -> 2/3 screen BW
    // 2048 -> 1/3 screen BW (default)
    if (imageNames.length > 0) {
        basicCode   += `190 REM Reserva memoria requerida por loader. Para cargar 1 full scr.\n`;
        let initLine = ``
        // Code for 128k/+2
        initLine += `200 IF PEEK(23312) <> 1 THEN`;
        imageNames.forEach(name => {
            const nm = (name || '');
            initLine += `:LOAD "${nm}" CODE 58456:SAVE! "${nm}" CODE 58456,2048`; 
        });
        initLine += `\n`;
        // Code for +2a/+3
        initLine += `210 IF PEEK(23312)=1 THEN`;
        imageNames.forEach(name => {
            const nm = (name || '');
            initLine += `:LOAD "${nm}" CODE 58456:SAVE "M:${nm}" CODE 58456,2048`; 
        });
        initLine += `\n`;
        basicCode += initLine;
    }

    // Load and activate new font.
    // At the moment assume that file contains a whole font.
    if (globalConfig.font) {
        // Assume only one font. So use generic name.
        basicCode += `220 LOAD "font" CODE 64600,768: POKE 23606,88: POKE 23607,251\n`;
        //const fname = globalConfig.font.fontName.toLowerCase().slice(0,10);
        //basicCode += `220 LOAD "${fname}" CODE 64600,768`;
    }

    // Load game code. 
    basicCode += `300 LOAD "adventure"\n`;

    // Soubroutine to define UDGs.
    const udgs = getDefaultUDGs(globalConfig)
    const udgA = udgs[0]
    const udgB = udgs[1]

    basicCode += `
    1000 REM Set UDGs
    1010 DATA BIN ${udgA[0]},BIN ${udgA[1]},BIN ${udgA[2]},BIN ${udgA[3]},BIN ${udgA[4]},BIN ${udgA[5]},BIN ${udgA[6]},BIN ${udgA[7]}
    1020 DATA BIN ${udgB[0]},BIN ${udgB[1]},BIN ${udgB[2]},BIN ${udgB[3]},BIN ${udgB[4]},BIN ${udgB[5]},BIN ${udgB[6]},BIN ${udgB[7]}
    1030 FOR X=USR("A") TO USR("A")+15
    1040 READ N
    1050 POKE X,N
    1060 NEXT X
    1070 RETURN`;
    

    return basicCode

}
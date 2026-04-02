// author: Moises Garin
//
// An utility class to handle and manimupate screen data
//


/**
 * Given row index in linear image, return
 * The row index in interlaced image.
 * 
 * @param {int} i 
 * @returns 
 */
function getInterlacedRowIndex(i) {
    const y210 = i & 0b00000111;
    const y543 = i & 0b00111000;
    const y76  = i & 0b11000000;
    return y76 | (y210 << 3) | (y543 >> 3);
}


/**
 * 
 */
export class Screen {
    /**
     *
     * scr: {"scr"|"lin"|"char"} Define byte ordering.
     *     "scr" normal interlaced structure of screen.
     *     "lin" row-linear screen ordering.
     *     "char" Characer-wise ordering. 
     * @param {Uint8Array} buffer 
     */
    constructor(bytes, width=32, height=24, type="scr") {
        this.width = 32; // in characters.
        this.height = 24; // in characters.
        this.size = this.width * this.height * (8 + 1); // size of screen in bytes.

        if (bytes.length !== 6912) {
            throw new Error(`Bad screen size (${bytes.length} bytes).`)
        } 
        this.bytes = bytes;
        this.type = type;

        // Strides to loop through the screen data.
        if (type === "scr") {
            this.strideChar = 256; // Stride through 8 bytes of a character.
            this.strideRow = 1; // Stride through characters of a row.
        } else if (type === "lin") {
            this.strideChar = 32;
            this.strideRow = 1;
        } else if (type === "char") {
            this.strideChar = 1;
            this.strideRow = 8;
        } else throw new Error(`Bad screen type (${this.type})`);
    }

    // Constuct from base64 data.
    static fromBase64(img) {
        // Image from base64 to byte string.
        const base64Data = (img || '').split(',')[1] || '';
        const binaryString = 
            typeof atob === 'function' 
                ? atob(base64Data) 
                : Buffer.from(base64Data, 'base64').toString('binary');
        
        // Bytes to array.
        const imageBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) imageBytes[i] = binaryString.charCodeAt(i);
        
        return new Screen(imageBytes)
    }


    /**
     * Return bytes corresponding to attributes.
     */
    getAttrBytes() {
        const attrsize = this.width * this.height;
        return this.bytes.slice(-attrsize);
    }


    /**
     * Return bytes corresponding to pixel data.
     * @returns 
     */
    getPixelBytes() {
        const pixsize = this.width * this.height * 8;
        return this.bytes.slice(0, pixsize);
    }


    /**
     * Given character row and column, return
     * the address in byte buffer of the top byte of character.
     * @param {*} row 
     * @param {*} col 
     */
    getCharAddr(row,col) {
        if (this.type === "scr") {
            const irow = getInterlacedRowIndex(row*8);
            return irow*this.width + col;
        } else if (this.type === "lin") {
            return row*this.width*8 + col;
        } else if (this.type === "char") {
            return (row*this.width + col) * 8;
        } else {
            throw new Error(`Invalid screen image type`)
        }
    }

    /**
     * Return true if any pixel of the character is set,
     * false otherwise.
     */
    testCharacter(row,col) {
        const addr = this.getCharAddr(row,col);
        let c = 0;
        for (let i=0; i<8; i++) {
            c += this.bytes[addr + i*this.strideChar];
        }
        return c != 0;
    }

    /**
     * Calculate the bounding box, in characters, of the
     * image considering set pixels.
     * 
     * return {left,right,top,bottom}
     * where
     * - left: leftmost column with pixel data.
     * - right: right-most column with pixel data.
     * - top: top-most row with pixel data.
     * - bottom: bottom-most row with pixel data.
     */
    calcBoundingBox() {
        //let [left, right, top, bottom] = [32, 0, 24, 0];
        const bbox = {
            left: this.width,
            right: 0,
            top: this.height,
            bottom: 0
        }
        for (let r=0; r<this.height; r++) {
            for (let c=0; c<this.width; c++) {
                if (this.testCharacter(r,c)) {
                    bbox.left = c < bbox.left ? c : bbox.left;
                    bbox.right = c > bbox.right ? c : bbox.right;
                    bbox.top = r < bbox.top ? r : bbox.top;
                    bbox.bottom = r > bbox.bottom ? r : bbox.bottom; 
                }
            }
        }
        //return [left, right, top, bottom];
        return bbox;
    }

    /**
     * Crop an image that is in char ordering.
     * 
     * @param {*} bbox 
     */
    cropChar(bbox) {
        if (this.type !== "char") {
            throw new Error("Image need to be in char ordering.")
        }
        const width = bbox.right - bbox.left + 1;
        const height = bbox.bottom - bbox.top + 1;
    }

    /**
     * Return the effective height of the image in characters.
     * It assumes that all bottom rows with attr byte = 0, are
     * not used. Does not check actual pixels.
     */
    getEffectiveHeight() {
        const attr = this.getAttrBytes();
        for (var r=this.height-1; r>=0; r--) {
            for (var c=0; c<this.width; c++) {
                if (attr[r*this.width+c]) {
                    break;
                } 
            }
            if (c !== this.width) break;
        }
        return r + 1;
    }


    /**
     * Return a copy of image with linear memory layout.
     * Call this twice to return to the original (i.e. interlace again).
     */
    deinterlace() {
        // New array.
        const data = this.bytes.slice()

        // Retorder rows.
        for (let i=0; i<8*this.height; i++) {
            const ii = i*this.width;
            const jj = getInterlacedRowIndex(i) * this.width;
            for (let c=0; c<this.width; c++) {
                data[ii+c] = this.bytes[jj+c];
            }
        }
        return new Screen(data, this.width, this.height, "lin");
    }


    /**
     * Given a pixel row and char column, return the
     * corresponding byte with 8 pixel data.
     * Pixel row in given "linear".
     * 
     * @param {*} row 
     * @param {*} col 
     */
    getByteLinear(row,col) {
        const irow = getInterlacedRowIndex(row);
        return this.bytes[irow*this.width + col]; 
    }



    /**
     * Transpose image data into a character layout.
     * This means, same order as in a character set.
     * All pixel data of a single character together, 
     * starting from top left character. row by row,
     * left to right, top to bottom.
     * 
     * Important
     * ---------
     * This function must be called into a previously
     * linearlized image.
     */
    toCharOrdering() {
        const bytes = this.bytes.slice()
        let i = 0;
        for (let r=0; r<this.height; r++) {
            for (let c=0; c<this.width; c++) {
                const addr = this.getCharAddr(r,c);
                // Loop inside character.
                for (let b=0; b<8; b++) {
                    bytes[i] = this.bytes[addr + b*this.strideChar];
                    i++;
                }
            }
        }
        return new Screen(bytes, this.width, this.height, "char");
    }


    /**
     * Transpose image data into a character layout.
     * This means, same order as in a character set.
     * All pixel data of a single character together, 
     * starting from top left character. row by row,
     * left to right, top to bottom.
     * 
     * Important
     * ---------
     * This function must be called into a previously
     * linearlized image.
     */
    transpose_() {
        const bytes = this.bytes.slice()
        let i = 0;
        let j = 0;
        for (let r=0; r<this.height; r++) {
            for (let c=0; c<this.width; c++) {
                // Loop inside character.
                for (let b=0; b<8; b++) {
                    // Calculate byte location in image.
                    j = r*this.width*8 + c + b*this.width;
                    bytes[i] = this.bytes[j];
                    i++;
                }
            }
        }
        return new Screen(bytes);
    }

}
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

export class Screen {
    /**
     * 
     * @param {Uint8Array} buffer 
     */
    constructor(bytes) {
        if (bytes.length !== 6912) {
            throw new Error("Not corrent screen size.")
        } 
        this.bytes = bytes;
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
        return this.bytes.slice(-768);
    }

    /**
     * Return bytes corresponding to pixel data.
     * @returns 
     */
    getPixelBytes() {
        return this.bytes.slice(0,6144);
    }

    /**
     * Return the effective height of the image in characters.
     * It assumes that all bottom rows with attr byte = 0, are
     * not used. Does not check actual pixels.
     */
    getEffectiveHeight() {
        const attr = this.getAttrBytes();
        for (var r=23; r>=0; r--) {
            for (var c=0; c<32; c++) {
                if (attr[r*32+c]) {
                    break;
                } 
            }
            if (c!==32) break;
        }
        return r+1;
    }


    /**
     * Return a copy of image with linear memory layout.
     * Call this twice to return to the original (i.e. interlace again).
     */
    deinterlace() {
        // New array.
        const data = this.bytes.slice()

        // Retorder rows.
        for (let i=0; i<192; i++) {
            const ii = i*32;
            const jj = getInterlacedRowIndex(i) * 32;
            for (let c=0; c<32; c++) {
                data[ii+c] = this.bytes[jj+c];
            }
        }

        return new Screen(data);
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
    transpose() {
        const bytes = this.bytes.slice()
        let i = 0;
        let j = 0;
        for (let r=0; r<24; r++) {
            for (let c=0; c<32; c++) {
                // Loop inside character.
                for (let b=0; b<8; b++) {
                    // Calculate byte location in image.
                    j = r*32*8 + c + b*32;
                    bytes[i] = this.bytes[j];
                    i++;
                }
            }
        }
        return new Screen(bytes);
    }



}
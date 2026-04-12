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
     * @param {Uint8Array} buffer 
     * @width {int} width of image in characters
     * @height {int} height of image in hcharacters
     * @type {string} Define byte ordering in image. 
     *      type in {"scr"|"lin"|"char"}
     *      "scr" normal interlaced structure of screen.
     *      "lin" row-linear screen ordering.
     *      "char" Characer-wise ordering. 
     */
    constructor(bytes, width=32, height=24, type="scr") {
       
        this.width = width; // in characters.
        this.height = height; // in characters.
        this.pixsize = this.width * this.height * 8; // total bytes of pixel data.
        this.attrsize = this.width * this.height * 1; // total bytes of attr data.
        this.size = this.pixsize + this.attrsize; // total size of screen in bytes.
        
        // Check consistence of image data size.
        if (bytes.length !== this.size) {
            throw new Error(`Bad screen size (${bytes.length} bytes).`)
        } else if ((width !== 32 || height !==24) && type==="scr") {
            // Screen type (scr) must be always full screen. 
            // Otherwise it does not make sense.
            throw new Error(`Bad size for "scr".`)
        }
        this.bytes = bytes;
        this.type = type; // byte ordering.

        // Strides to loop through the screen data.
        if (type === "scr") {
            this.strideChar = 256; // Stride through 8 bytes of a character.
            this.strideRow = 1; // Stride through characters of a row.
        } else if (type === "lin") {
            this.strideChar = this.width;
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
     * Return copy of bytes corresponding to attributes.
     */
    getAttrBytes() {
        return this.bytes.slice(-this.attrsize);
    }


    /**
     * Return copy of bytes corresponding to pixel data.
     * @returns 
     */
    getPixelBytes() {
        return this.bytes.slice(0, this.pixsize);
    }

    /**
     * Return attr byte for said character.
     * 
     * @param {*} row, in characters 
     * @param {*} col, in characters
     */
    getAttr(row,col) {
        return this.bytes[this.pixsize + row*this.width + col];
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
     * Return TRUE if all bytes of the character are
     * equal to the value provided.
     * 
     * This is just an utility function.
     *  
     * @param {int} row 
     * @param {int} col 
     * @param {ubyte} val 
     */
    testCharBytes(row,col,val){
        const addr = this.getCharAddr(row,col);
        for (let i=0; i<8; i++) {
            if (this.bytes[addr + i*this.strideChar] !== val) return false
        }
        return true;
    }


    /**
     * For a given character position (row,column), 
     * return an attribute mask that keeps only
     * meaningful attr bits for that particular character.
     * 
     * Active bits correspond to relevant attribute data.
     * 
     * For instance, if a character has no pixel active,
     * INK bits are not relevant, as they are not visible. 
     */
    getCharAttrMask(row,col) {
        const attr = this.getAttr(row,col);
        const ink = attr & 0b111;
        const paper = (attr & 0b111000) >> 3;
        let mask = 0;
        
        // Check if ink bits are relevant.
        mask |= this.testCharBytes(row,col,0) ? 0 : 0b111;
        // Check if paper bits are relevant.
        mask |= this.testCharBytes(row,col,255) ? 0 : 0b111000;
        // Check if bright bit is relevant.
        mask |= ink || paper ? 0b01000000 : 0;
        // check if flash bit is relevant.
        mask |= ink != paper ? 0b10000000 : 0;
        
        return mask
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
        const size = width * height * 8;

        const bytes = new Uint8Array(size);
        
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                const i = (r * width + c ) * 8;
                const j = ((r + bbox.top) * this.width + c + bbox.left) * 8;
                for (let b = 0; b < 8; b++) {
                    bytes[i+b] = this.bytes[j+b];
                }
            }
        }
        return bytes
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


    // !!!! This function is superseded by testSingleAttr
    // !!!! and needs to be fully removed if no bug found. 
    // /**
    //  * Return true if ony one attribute is used
    //  * within the box.
    //  * 
    //  * @param {*} bbox 
    //  */
    // testSingleColor(bbox) {
    //     const ref = this.getAttr(bbox.top, bbox.left);
    //     for (let r=bbox.top; r<=bbox.bottom; r++) {
    //         for (let c=bbox.left; c<=bbox.right; c++) {
    //             if (this.getAttr(r,c) !== ref) {
    //                 return false;
    //             }
    //         }
    //     }
    //     return true;
    // }



    /**
     * Test if the image can be represented by a
     * single attribute and return it. Otherwise return -1.
     * 
     * This is an improved version of the routine testSingleColor that 
     * takes into account the pixel data for the text.
     * This version takes into account if the attributes
     * are actually "visible" to determine whether they
     * are the same or not.
     */
    testSingleAttr(bbox){
        let refattr = 0;
        let refmask = 0;

        for (let r=bbox.top; r<=bbox.bottom; r++) {
            for (let c=bbox.left; c<=bbox.right; c++) {
                let attr = this.getAttr(r,c);
                let mask = this.getCharAttrMask(r,c);
                if ((attr & mask & refmask) !== (refattr & mask & refmask)) {
                    return -1;
                }
                refmask |= mask;
                refattr |= attr & mask;
            }
        }
        return refattr;
    }


    // header description.
    // byte - use.
    // 0 - image type. (0 -> BW, 1 -> color, 2 -> Compressed color) 
    // 1 - size in rows.
    // 2 - size in columns.
    // 3 - column position.
    //
    // Image types:
    //     0 -> BW image. Will be drawn using ink and paper of text.
    //     1 -> Color. Image comes with full attribute information.
    //     2 -> Compressed color. Particular image where uses the
    //          the same ink and paper everywhere. So, it stores
    //          color information as a single attribute byte.

    /**
     * Crops the image removing unsied pixel data.
     * 
     * v3: Discards top and bottom part of image.
     *     Limit to 15 rows.
     *     Header: number fo rows (1 byte)
     */
    compressMuchoBW() {

        const MAXROWS = 15;
        const HEADER_SIZE = 4;

        // Require "char" byte order.
        if (this.type !== "char") {
            return this.toCharOrdering().compressMucho()
        }

        // This function requires full width screen data.
        if (this.width != 32 || this.height != 24) {
            throw new Error(`Require full-sized screen image.`)
        }
       
        // Calculate required size.
        const bbox = this.calcBoundingBox();
        let height = bbox.bottom - bbox.top + 1;
        height = height > MAXROWS ? MAXROWS : height;
        
        const start = bbox.top * this.width * 8;
        const end = start + height * this.width * 8;
        const size = height * this.width * 8;


        const bytes = new Uint8Array(size + HEADER_SIZE);
        bytes.set([0, height, this.width, 0],0);
        bytes.set(this.bytes.slice(start,end),HEADER_SIZE);



        return bytes;
    }





    // /**
    //  * Crops the image removing unsied pixel data.
    //  * 
    //  * v3: Discards top and bottom part of image.
    //  *     Limit to 15 rows.
    //  *     Header: number fo rows (1 byte)
    //  */
    // compressMucho2() {

    //     const MAXROWS = 15;
    //     const HEADER_SIZE = 4;

    //     // Require "char" byte order.
    //     if (this.type !== "char") {
    //         return this.toCharOrdering().compressMucho()
    //     }

    //     // This function requires full width screen data.
    //     if (this.width != 32 || this.height != 24) {
    //         throw new Error(`Require full-sized screen image.`)
    //     }
       
    //     // Calculate required size.
    //     const bbox = this.calcBoundingBox();
    //     let height = bbox.bottom - bbox.top + 1;
    //     height = height > MAXROWS ? MAXROWS : height;
    //     const width = this.width; // By now assume full width.
       
    
    //     const start = bbox.top * this.width * 8;
    //     const end = start + height * this.width * 8;
    //     const pixsize = this.width * height * 8;

    //     const attraddr = this.width * this.height * 8;
    //     const attrstart = attraddr + bbox.top * this.width;
    //     const attrend = attrstart + height * this.width;
    //     const attrsize = this.width * height;


    //     if (this.testSingleColor(bbox)) {
    //         // Case of Figure with a single color attribute.
    //         const bytes = new Uint8Array(pixsize + 1 + HEADER_SIZE);
    //         bytes.set([2, height, width, 0],0);
    //         bytes.set(this.bytes.slice(start,end),HEADER_SIZE);
    //         bytes.set([this.bytes[attraddr + bbox.top*this.width + bbox.left]],HEADER_SIZE+pixsize);
    //         return bytes
    //     } else {
    //         // Case of Figure with full color attribute.
    //         const bytes = new Uint8Array(pixsize + attrsize + HEADER_SIZE);
    //         bytes.set([1, height, width, 0],0);
    //         bytes.set(this.bytes.slice(start,end),HEADER_SIZE);
    //         bytes.set(this.bytes.slice(attrstart,attrend),HEADER_SIZE+pixsize);
    //         return bytes;
    //     }
  
    // }


    /**
     * Crops the image removing unsied pixel data.
     * 
     * Discards top and bottom part of image without pixel data.
     * Discard left and right part of the image without pixel data.
     * For attributes, only discard top and bottom part, for speed reasons.
     * 
     *     Limit to 15 rows.
     *     Header: number fo rows (1 byte)
     */
    compressMucho() {

        const MAXROWS = 15;
        const HEADER_SIZE = 4;

        // Require "char" byte order.
        if (this.type !== "char") {
            return this.toCharOrdering().compressMucho()
        }

        // This function requires full width screen data.
        if (this.width != 32 || this.height != 24) {
            throw new Error(`Require full-sized screen image.`)
        }
       
        // Calculate required size. limiting to MAXROWS
        const bbox = this.calcBoundingBox();
        let height = bbox.bottom - bbox.top + 1;
        height = height > MAXROWS ? MAXROWS : height;
        const width = bbox.right - bbox.left + 1;
        bbox.bottom = bbox.top + height - 1;
       
    
        const start = (bbox.top * this.width + bbox.left) * 8;
        const end = start + height * this.width * 8;
        const pixsize = width * height * 8;

        const attrstart = this.pixsize + bbox.top * this.width;
        const attrend = attrstart + height * this.width;
        const attrsize = this.width * height;


        const singleAttr = this.testSingleAttr(bbox);
        if (singleAttr !== -1) {
            // Case of Figure with a single color attribute.
            const bytes = new Uint8Array(pixsize + 1 + HEADER_SIZE);
            bytes.set([2, height, width, bbox.left],0);
            bytes.set(this.cropChar(bbox),HEADER_SIZE);
            bytes.set([singleAttr],HEADER_SIZE+pixsize);
            return bytes
        } else {
            // Case of Figure with full color attribute.
            const bytes = new Uint8Array(pixsize + attrsize + HEADER_SIZE);
            bytes.set([1, height, width, bbox.left],0);
            bytes.set(this.cropChar(bbox),HEADER_SIZE);
            bytes.set(this.bytes.slice(attrstart,attrend),HEADER_SIZE+pixsize);
            return bytes;
        }
  
    }


}
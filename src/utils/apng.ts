/* eslint-disable */

/**
 * apng-canvas v2.1.2 - heavily modified
 *
 * @copyright 2011-2019 David Mzareulyan
 * @link https://github.com/davidmz/apng-canvas
 * @license MIT
 */

// ===== animation.js =====

// https://wiki.mozilla.org/APNG_Specification#.60fcTL.60:_The_Frame_Control_Chunk
export const enum ApngDisposeOp {
    /**
     * no disposal is done on this frame before rendering the next; the contents of the output buffer are left as is.
     */
    NONE,
    /**
     * the frame's region of the output buffer is to be cleared to fully transparent black before rendering the next frame.
     */
    BACKGROUND,
    /**
     * the frame's region of the output buffer is to be reverted to the previous contents before rendering the next frame.
     */
    PREVIOUS
}

// TODO: Might need to somehow implement this
export const enum ApngBlendOp {
    SOURCE,
    OVER
}

interface Frame {
    width: number;
    height: number;
    left: number;
    top: number;
    delay: number;
    disposeOp: ApngDisposeOp;
    blendOp: ApngBlendOp;
    dataParts?: Uint8Array[];
    img: HTMLImageElement;
}

class Animation {
    width = 0;
    height = 0;
    numPlays = 0;
    playTime = 0;
    frames: Frame[] = [];
}

// ===== crc32.js =====
const table = new Uint32Array(256);

for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
}

function crc32(bytes: Uint8Array, start: number = 0, length?: number): number {
    length = length ?? (bytes.length - start);
    let crc = -1;
    for (let i = start, l = start + length; i < l; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
    }
    return crc ^ (-1);
}


// ===== parser.js =====
const PNG_SIGNATURE_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function parseAPNG(buffer: ArrayBuffer): Promise<Animation> {
    const bytes = new Uint8Array(buffer);
    return new Promise(function (resolve, reject) {

        for (let i = 0; i < PNG_SIGNATURE_BYTES.length; i++) {
            if (PNG_SIGNATURE_BYTES[i] != bytes[i]) {
                reject("Not a PNG file (invalid file signature)");
                return;
            }
        }

        // fast animation test
        let isAnimated = false;
        parseChunks(bytes, function (type) {
            if (type == "acTL") {
                isAnimated = true;
                return false;
            }
            return true;
        });
        if (!isAnimated) {
            reject("Not an animated PNG");
            return;
        }

        const preDataParts: Uint8Array[] = [];
        const postDataParts: Uint8Array[] = [];
        let headerDataBytes: Uint8Array | null = null;
        let frame: Frame | null = null;
        const anim = new Animation();

        parseChunks(bytes, function (type, bytes, off, length) {
            switch (type) {
                case "IHDR":
                    headerDataBytes = bytes.subarray(off + 8, off + 8 + length);
                    anim.width = readDWord(bytes, off + 8);
                    anim.height = readDWord(bytes, off + 12);
                    break;
                case "acTL":
                    anim.numPlays = readDWord(bytes, off + 8 + 4);
                    break;
                case "fcTL":
                    if (frame) anim.frames.push(frame);
                    frame = {} as Frame;
                    frame.width = readDWord(bytes, off + 8 + 4);
                    frame.height = readDWord(bytes, off + 8 + 8);
                    frame.left = readDWord(bytes, off + 8 + 12);
                    frame.top = readDWord(bytes, off + 8 + 16);
                    let delayN = readWord(bytes, off + 8 + 20);
                    let delayD = readWord(bytes, off + 8 + 22);
                    if (delayD == 0) delayD = 100;
                    frame.delay = 1000 * delayN / delayD;
                    // see http://mxr.mozilla.org/mozilla/source/gfx/src/shared/gfxImageFrame.cpp#343
                    if (frame.delay <= 10) frame.delay = 100;
                    anim.playTime += frame.delay;
                    frame.disposeOp = readByte(bytes, off + 8 + 24);
                    frame.blendOp = readByte(bytes, off + 8 + 25);
                    frame.dataParts = [];
                    break;
                case "fdAT":
                    if (frame) frame.dataParts!.push(bytes.subarray(off + 8 + 4, off + 8 + length));
                    break;
                case "IDAT":
                    if (frame) frame.dataParts!.push(bytes.subarray(off + 8, off + 8 + length));
                    break;
                case "IEND":
                    postDataParts.push(subBuffer(bytes, off, 12 + length));
                    break;
                default:
                    preDataParts.push(subBuffer(bytes, off, 12 + length));
            }
        });

        if (frame) anim.frames.push(frame);

        if (anim.frames.length == 0) {
            reject("Not an animated PNG");
            return;
        }

        // creating images
        let createdImages = 0;
        const preBlob = new Blob(preDataParts as Uint8Array<ArrayBuffer>[]);
        const postBlob = new Blob(postDataParts as Uint8Array<ArrayBuffer>[]);
        for (let f = 0; f < anim.frames.length; f++) {
            frame = anim.frames[f];

            const bb: (Uint8Array | Blob)[] = [];
            bb.push(PNG_SIGNATURE_BYTES);
            headerDataBytes!.set(makeDWordArray(frame.width), 0);
            headerDataBytes!.set(makeDWordArray(frame.height), 4);
            bb.push(makeChunkBytes("IHDR", headerDataBytes!));
            bb.push(preBlob);
            for (let j = 0; j < frame.dataParts!.length; j++) {
                bb.push(makeChunkBytes("IDAT", frame.dataParts![j]));
            }
            bb.push(postBlob);
            const url = URL.createObjectURL(new Blob(bb as Uint8Array<ArrayBuffer>[], { "type": "image/png" }));
            delete frame.dataParts;

            /**
             * Using "createElement" instead of "new Image" because of bug in Chrome 27
             * https://code.google.com/p/chromium/issues/detail?id=238071
             * http://stackoverflow.com/questions/16377375/using-canvas-drawimage-in-chrome-extension-content-script/16378270
             */
            const img = frame.img = new Image();
            img.onload = function () {
                URL.revokeObjectURL(img.src);
                createdImages++;
                if (createdImages == anim.frames.length) {
                    resolve(anim);
                }
            };
            img.onerror = function () {
                reject("Image creation error");
            };
            img.src = url;
        }
    });
}

function parseChunks(bytes: Uint8Array, callback: (type: string, bytes: Uint8Array, off: number, length: number) => boolean | void): void {
    let off = 8;
    let res: boolean | void;
    let type: string;

    do {
        const length = readDWord(bytes, off);
        type = readString(bytes, off + 4, 4);
        res = callback(type, bytes, off, length);
        off += 12 + length;
    } while (res !== false && type != "IEND" && off < bytes.length);
}

function readDWord(bytes: Uint8Array, off: number): number {
    let x = 0;
    // Force the most-significant byte to unsigned.
    x += ((bytes[0 + off] << 24) >>> 0);
    for (let i = 1; i < 4; i++) x += ((bytes[i + off] << ((3 - i) * 8)));
    return x;
}

function readWord(bytes: Uint8Array, off: number): number {
    let x = 0;
    for (let i = 0; i < 2; i++) x += (bytes[i + off] << ((1 - i) * 8));
    return x;
}

function readByte(bytes: Uint8Array, off: number): number {
    return bytes[off];
}

function subBuffer(bytes: Uint8Array, start: number, length: number): Uint8Array {
    const a = new Uint8Array(length);
    a.set(bytes.subarray(start, start + length));
    return a;
}

function readString(bytes: Uint8Array, off: number, length: number): string {
    const chars = Array.prototype.slice.call(bytes.subarray(off, off + length));
    return String.fromCharCode.apply(String, chars);
}

function makeDWordArray(x: number): number[] {
    return [(x >>> 24) & 0xff, (x >>> 16) & 0xff, (x >>> 8) & 0xff, x & 0xff];
}

function makeStringArray(x: string): number[] {
    const res: number[] = [];
    for (let i = 0; i < x.length; i++) res.push(x.charCodeAt(i));
    return res;
}

function makeChunkBytes(type: string, dataBytes: Uint8Array): Uint8Array {
    const crcLen = type.length + dataBytes.length;
    const bytes = new Uint8Array(new ArrayBuffer(crcLen + 8));
    bytes.set(makeDWordArray(dataBytes.length), 0);
    bytes.set(makeStringArray(type), 4);
    bytes.set(dataBytes, 8);
    const crc = crc32(bytes, 4, crcLen);
    bytes.set(makeDWordArray(crc), crcLen + 4);
    return bytes;
};

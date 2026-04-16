/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * This file contains modified code from:
 * https://github.com/tc39/proposal-arraybuffer-base64
 * * Copyright (c) 2017 ECMA TC39 and contributors
 * *
 * * Permission is hereby granted, free of charge, to any person obtaining a copy
 * * of this software and associated documentation files (the "Software"), to deal
 * * in the Software without restriction, including without limitation the rights
 * * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * * copies of the Software, and to permit persons to whom the Software is
 * * furnished to do so, subject to the following conditions:
 * *
 * * The above copyright notice and this permission notice shall be included in all
 * * copies or substantial portions of the Software.
 * *
 * * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * * SOFTWARE.
 */

// TODO: Remove once discord stops being insane and updates electron

interface Uint8ArrayExtended<T extends ArrayBufferLike = ArrayBufferLike> extends Uint8Array<T> {
    toBase64(options?: { alphabet?: "base64" | "base64url"; omitPadding?: boolean; }): string;
}

interface Uint8ArrayConstructorExtended extends Uint8ArrayConstructor {
    fromBase64(
        base64: string,
        options?: {
            alphabet?: "base64" | "base64url";
            lastChunkHandling?: "loose" | "strict" | "stop-before-partial";
        }
    ): Uint8ArrayExtended<ArrayBuffer>;
}

function supportsToBase64(array: Uint8Array<ArrayBufferLike>): array is Uint8ArrayExtended<ArrayBufferLike> {
    return "toBase64" in array && typeof array.toBase64 === "function";
}

function supportsFromBase64(ctor: Uint8ArrayConstructor): ctor is Uint8ArrayConstructorExtended {
    return "fromBase64" in ctor && typeof ctor.fromBase64 === "function";
}

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const map = new Map(chars.split("").map((c, i) => [c, i]));

export function uint8ArrayToBase64(arr: Uint8Array): string {
    if (supportsToBase64(arr)) {
        return arr.toBase64({ alphabet: "base64url", omitPadding: true });
    }

    if ("detached" in arr.buffer && arr.buffer.detached) {
        throw new TypeError("toBase64 called on array backed by detached buffer");
    }

    let result = "";

    let i = 0;
    for (; i + 2 < arr.length; i += 3) {
        const triplet = (arr[i] << 16) + (arr[i + 1] << 8) + arr[i + 2];
        result +=
            chars[(triplet >> 18) & 63] +
            chars[(triplet >> 12) & 63] +
            chars[(triplet >> 6) & 63] +
            chars[triplet & 63];
    }
    if (i + 2 === arr.length) {
        const triplet = (arr[i] << 16) + (arr[i + 1] << 8);
        result += chars[(triplet >> 18) & 63] + chars[(triplet >> 12) & 63] + chars[(triplet >> 6) & 63];
    } else if (i + 1 === arr.length) {
        const triplet = arr[i] << 16;
        result += chars[(triplet >> 18) & 63] + chars[(triplet >> 12) & 63];
    }

    return result;
}

function decodeBase64Chunk(chunk: string): number[] {
    const actualChunkLength = chunk.length;
    if (actualChunkLength < 4) {
        chunk += actualChunkLength === 2 ? "AA" : "A";
    }

    const c1 = chunk[0];
    const c2 = chunk[1];
    const c3 = chunk[2];
    const c4 = chunk[3];

    const triplet = (map.get(c1)! << 18) + (map.get(c2)! << 12) + (map.get(c3)! << 6) + map.get(c4)!;

    const chunkBytes = [(triplet >> 16) & 255, (triplet >> 8) & 255, triplet & 255];

    if (actualChunkLength === 2) {
        return [chunkBytes[0]];
    } else if (actualChunkLength === 3) {
        return [chunkBytes[0], chunkBytes[1]];
    }
    return chunkBytes;
}

const asciiWhitespaceRegex = /[\u0009\u000A\u000C\u000D\u0020]/;
function skipAsciiWhitespace(string: string, index: number): number {
    for (; index < string.length; ++index) {
        if (!asciiWhitespaceRegex.test(string[index])) {
            break;
        }
    }
    return index;
}

export function base64ToUint8Array(string: string): Uint8Array {
    if (supportsFromBase64(Uint8Array)) {
        return Uint8Array.fromBase64(string, { alphabet: "base64url" });
    }

    const bytes: number[] = [];
    let chunk = "";

    let index = 0;
    while (true) {
        index = skipAsciiWhitespace(string, index);
        if (index === string.length) {
            if (chunk.length > 0) {
                if (chunk.length === 1) {
                    throw new SyntaxError("malformed padding: exactly one additional character");
                }
                bytes.push(...decodeBase64Chunk(chunk));
            }
            break;
        }
        const char = string[index];
        ++index;
        if (char === "=") {
            if (chunk.length < 2) {
                throw new SyntaxError("padding is too early");
            }
            index = skipAsciiWhitespace(string, index);
            if (chunk.length === 2) {
                if (index === string.length) {
                    throw new SyntaxError("malformed padding - only one =");
                }
                if (string[index] === "=") {
                    ++index;
                    index = skipAsciiWhitespace(string, index);
                }
            }
            if (index < string.length) {
                throw new SyntaxError("unexpected character after padding");
            }
            bytes.push(...decodeBase64Chunk(chunk));
            break;
        }
        if (!chars.includes(char)) {
            throw new SyntaxError(`unexpected character ${JSON.stringify(char)}`);
        }

        chunk += char;
        if (chunk.length === 4) {
            bytes.push(...decodeBase64Chunk(chunk));
            chunk = "";
        }
    }

    return new Uint8Array(bytes);
}

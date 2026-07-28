/* eslint-disable simple-header/header */

/**
 * discord-intl
 *
 * @copyright 2024 Discord, Inc.
 * @link https://github.com/discord/discord-intl
 * @license MIT
 */

import { hash as h64 } from "@intrnl/xxhash64";

const BASE64_TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
const IS_BIG_ENDIAN = (() => {
    const array = new Uint8Array(4);
    const view = new Uint32Array(array.buffer);
    return !((view[0] = 1) & array[0]);
})();

function numberToBytes(number: number | bigint) {
    number = BigInt(number);
    const array: number[] = [];
    const byteCount = Math.ceil(Math.floor(Math.log2(Number(number)) + 1) / 8);
    for (let i = 0; i < byteCount; i++) {
        array.unshift(Number((number >> BigInt(8 * i)) & BigInt(255)));
    }

    const bytes = new Uint8Array(array);
    // The native `hashToMessageKey` always works in Big/Network Endian bytes, so this array
    // needs to be converted to the same endianness to get the same base64 result.
    return IS_BIG_ENDIAN ? bytes : bytes.reverse();
}

/**
 * Returns a consistent, short hash of the given key by first processing it through a hash digest,
 * then encoding the first few bytes to base64.
 *
 * This function is specifically written to mirror the native backend hashing function used by
 * `@discord/intl-loader-core`, to be able to hash names at runtime.
 */
export function runtimeHashMessageKey(key: string): string {
    const hash = h64(key, 0);
    const bytes = numberToBytes(hash);
    return [
        BASE64_TABLE[bytes[0] >> 2],
        BASE64_TABLE[((bytes[0] & 0x03) << 4) | (bytes[1] >> 4)],
        BASE64_TABLE[((bytes[1] & 0x0f) << 2) | (bytes[2] >> 6)],
        BASE64_TABLE[bytes[2] & 0x3f],
        BASE64_TABLE[bytes[3] >> 2],
        BASE64_TABLE[((bytes[3] & 0x03) << 4) | (bytes[4] >> 4)],
    ].join("");
}

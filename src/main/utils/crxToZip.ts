/* eslint-disable simple-header/header */

/*!
 * crxToZip
 * Copyright (c) 2013 Rob Wu <rob@robwu.nl>
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export function crxToZip(buf: Buffer) {
    function calcLength(a: number, b: number, c: number, d: number) {
        let length = 0;

        length += a << 0;
        length += b << 8;
        length += c << 16;
        length += d << 24 >>> 0;
        return length;
    }

    // 50 4b 03 04
    // This is actually a zip file
    if (buf[0] === 80 && buf[1] === 75 && buf[2] === 3 && buf[3] === 4) {
        return buf;
    }

    // 43 72 32 34 (Cr24)
    if (buf[0] !== 67 || buf[1] !== 114 || buf[2] !== 50 || buf[3] !== 52) {
        throw new Error("Invalid header: Does not start with Cr24");
    }

    // 02 00 00 00
    // or
    // 03 00 00 00
    const isV3 = buf[4] === 3;
    const isV2 = buf[4] === 2;

    if ((!isV2 && !isV3) || buf[5] || buf[6] || buf[7]) {
        throw new Error("Unexpected crx format version number.");
    }

    if (isV2) {
        const publicKeyLength = calcLength(buf[8], buf[9], buf[10], buf[11]);
        const signatureLength = calcLength(buf[12], buf[13], buf[14], buf[15]);

        // 16 = Magic number (4), CRX format version (4), lengths (2x4)
        const zipStartOffset = 16 + publicKeyLength + signatureLength;

        return buf.subarray(zipStartOffset, buf.length);
    }
    // v3 format has header size and then header
    const headerSize = calcLength(buf[8], buf[9], buf[10], buf[11]);
    const zipStartOffset = 12 + headerSize;

    return buf.subarray(zipStartOffset, buf.length);
}

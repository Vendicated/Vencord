/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Point {
    x: number;
    y: number;
}

export interface QRCode {
    binaryData: number[];
    data: string;
    chunks: object[];
    version: number;
    location: {
        topRightCorner: Point;
        topLeftCorner: Point;
        bottomRightCorner: Point;
        bottomLeftCorner: Point;
        topRightFinderPattern: Point;
        topLeftFinderPattern: Point;
        bottomLeftFinderPattern: Point;
        bottomRightAlignmentPattern?: Point;
    };
}

export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number
): QRCode;

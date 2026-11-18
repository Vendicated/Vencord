/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Remuxes the Opus packets of a WebM file (as produced by Chromium's MediaRecorder) into an Ogg container.
// Chromium's MediaRecorder can't record Ogg directly, but Discord voice messages must be OggOpus

const EBML_MASTER_IDS = new Set([
    0x18538067, // Segment
    0x1654AE6B, // Tracks
    0xAE, // TrackEntry
    0x1F43B675, // Cluster
]);
const EBML_CODEC_PRIVATE = 0x63A2;
const EBML_SIMPLE_BLOCK = 0xA3;

const OGG_BOS = 0x02;
const OGG_EOS = 0x04;

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++)
        r = r & 0x80000000 ? (r << 1) ^ 0x04C11DB7 : r << 1;
    CRC_TABLE[i] = r >>> 0;
}

function readVint(data: Uint8Array, pos: number, keepMarker: boolean) {
    const first = data[pos];
    const length = Math.clz32(first) - 23;
    let value = keepMarker ? first : first & (0xFF >> length);
    for (let i = 1; i < length; i++)
        value = value * 256 + data[pos + i];

    return { value, length };
}

function parseWebm(data: Uint8Array) {
    let opusHead: Uint8Array | undefined;
    const packets: Uint8Array[] = [];

    let pos = 0;
    while (pos < data.length) {
        const id = readVint(data, pos, true);
        pos += id.length;
        const size = readVint(data, pos, false);
        pos += size.length;

        // Step into master elements instead of skipping them. This also handles MediaRecorder's unknown-size Segment and Clusters
        if (EBML_MASTER_IDS.has(id.value)) continue;

        const body = data.subarray(pos, pos + size.value);
        pos += size.value;

        if (id.value === EBML_CODEC_PRIVATE) {
            opusHead = body;
        } else if (id.value === EBML_SIMPLE_BLOCK) {
            // track number, 16-bit timecode, flags
            const trackNumber = readVint(body, 0, false);
            packets.push(body.subarray(trackNumber.length + 3));
        }
    }

    if (!opusHead) throw new Error("WebM file has no OpusHead");

    return { opusHead, packets };
}

function getOpusSampleCount(packet: Uint8Array) {
    const toc = packet[0];
    const config = toc >> 3;

    const frameSize = config < 12
        ? [480, 960, 1920, 2880][config & 3] // SILK
        : config < 16
            ? [480, 960][config & 1] // Hybrid
            : [120, 240, 480, 960][config & 3]; // CELT

    const frameCount = [1, 2, 2, packet[1] & 0x3F][toc & 3];

    return frameSize * frameCount;
}

function crc32(data: Uint8Array) {
    let crc = 0;
    for (const byte of data)
        crc = (crc << 8) ^ CRC_TABLE[(crc >>> 24) ^ byte];

    return crc >>> 0;
}

function createOggPage(packets: Uint8Array[], granulePosition: number, serial: number, sequence: number, headerType: number) {
    const lacing: number[] = [];
    let bodyLength = 0;
    for (const packet of packets) {
        for (let n = packet.length; n >= 255; n -= 255)
            lacing.push(255);
        lacing.push(packet.length % 255);
        bodyLength += packet.length;
    }

    const page = new Uint8Array(27 + lacing.length + bodyLength);
    const view = new DataView(page.buffer);

    page.set([0x4F, 0x67, 0x67, 0x53]); // OggS
    page[5] = headerType;
    view.setBigUint64(6, BigInt(granulePosition), true);
    view.setUint32(14, serial, true);
    view.setUint32(18, sequence, true);
    page[26] = lacing.length;
    page.set(lacing, 27);

    let offset = 27 + lacing.length;
    for (const packet of packets) {
        page.set(packet, offset);
        offset += packet.length;
    }

    view.setUint32(22, crc32(page), true);

    return page;
}

function createOpusTags() {
    const vendor = new TextEncoder().encode("Vencord");
    const tags = new Uint8Array(8 + 4 + vendor.length + 4);

    tags.set(new TextEncoder().encode("OpusTags"));
    new DataView(tags.buffer).setUint32(8, vendor.length, true);
    tags.set(vendor, 12);
    // comment count stays 0

    return tags;
}

export function webmToOgg(webm: ArrayBuffer) {
    const { opusHead, packets } = parseWebm(new Uint8Array(webm));
    const serial = Math.random() * 0xFFFFFFFF >>> 0;

    const pages = [
        createOggPage([opusHead], 0, serial, 0, OGG_BOS),
        createOggPage([createOpusTags()], 0, serial, 1, 0)
    ];

    let pagePackets: Uint8Array[] = [];
    let pageSegments = 0;
    let granulePosition = 0;

    for (const packet of packets) {
        const segments = Math.floor(packet.length / 255) + 1;
        if (pageSegments + segments > 255) {
            pages.push(createOggPage(pagePackets, granulePosition, serial, pages.length, 0));
            pagePackets = [];
            pageSegments = 0;
        }

        pagePackets.push(packet);
        pageSegments += segments;
        granulePosition += getOpusSampleCount(packet);
    }

    pages.push(createOggPage(pagePackets, granulePosition, serial, pages.length, OGG_EOS));

    return new Blob(pages, { type: "audio/ogg; codecs=opus" });
}

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const OGG_CAPTURE = [0x4F, 0x67, 0x67, 0x53];
const SAMPLE_RATE = 48_000;
const PACKETS_PER_PAGE = 50;
const TEXT_ENCODER = new TextEncoder();

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) {
        r = (r & 0x80000000) ? r << 1 ^ 0x04c11db7 : r << 1;
    }
    CRC_TABLE[i] = r >>> 0;
}

function crc32(data: Uint8Array) {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
        crc = (crc << 8 ^ CRC_TABLE[(crc >>> 24 ^ data[i]) & 0xff]) >>> 0;
    }
    return crc;
}

function writeInt(view: DataView, offset: number, value: number, bytes: 1 | 4 | 8) {
    if (bytes === 1) {
        view.setUint8(offset, value);
        return;
    }
    if (bytes === 4) {
        view.setUint32(offset, value >>> 0, true);
        return;
    }

    const low = value >>> 0;
    const high = Math.floor(value / 0x1_0000_0000);
    view.setUint32(offset, low, true);
    view.setUint32(offset + 4, high, true);
}

function concatBytes(parts: Uint8Array[]) {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

function lacePackets(packets: Uint8Array[]) {
    const table: number[] = [];
    for (const packet of packets) {
        let remaining = packet.length;
        while (remaining >= 255) {
            table.push(255);
            remaining -= 255;
        }
        table.push(remaining);
    }
    return { table, body: concatBytes(packets) };
}

function makePage(headerType: number, granule: number, serial: number, pageSeq: number, packets: Uint8Array[]) {
    const { table, body } = lacePackets(packets);
    const page = new Uint8Array(27 + table.length + body.length);
    const view = new DataView(page.buffer);

    page.set(OGG_CAPTURE, 0);
    writeInt(view, 4, 0, 1);
    writeInt(view, 5, headerType, 1);
    writeInt(view, 6, granule, 8);
    writeInt(view, 14, serial, 4);
    writeInt(view, 18, pageSeq, 4);
    writeInt(view, 26, table.length, 1);
    page.set(table, 27);
    page.set(body, 27 + table.length);
    writeInt(view, 22, crc32(page), 4);
    return page;
}

function makeOpusHead(channels: number, preSkip: number, inputSampleRate: number) {
    const head = new Uint8Array(19);
    const view = new DataView(head.buffer);
    head.set(TEXT_ENCODER.encode("OpusHead"), 0);
    head[8] = 1;
    head[9] = channels;
    view.setUint16(10, preSkip, true);
    view.setUint32(12, inputSampleRate, true);
    return head;
}

function makeOpusTags() {
    const vendor = TEXT_ENCODER.encode("Chrome");
    const comment = TEXT_ENCODER.encode("ENCODER=Chrome");
    const tags = new Uint8Array(8 + 4 + vendor.length + 4 + 4 + comment.length);
    const view = new DataView(tags.buffer);
    tags.set(TEXT_ENCODER.encode("OpusTags"), 0);
    view.setUint32(8, vendor.length, true);
    tags.set(vendor, 12);
    view.setUint32(12 + vendor.length, 1, true);
    view.setUint32(16 + vendor.length, comment.length, true);
    tags.set(comment, 20 + vendor.length);
    return tags;
}

export const OGG_OPUS_TYPE = "audio/ogg; codecs=opus";

export function isOggOpus(bytes: Uint8Array) {
    if (bytes.length < 36) return false;
    if (bytes[0] !== 0x4F || bytes[1] !== 0x67 || bytes[2] !== 0x67 || bytes[3] !== 0x53) return false;
    return new TextDecoder().decode(bytes.subarray(0, 64)).includes("OpusHead");
}

const OPUS_FRAME_MS = [
    10, 20, 40, 60, 10, 20, 40, 60, 10, 20, 40, 60, 10, 20, 10, 20,
    2.5, 5, 10, 20, 2.5, 5, 10, 20, 2.5, 5, 10, 20, 2.5, 5, 10, 20,
];

function opusPacketSamples(packet: Uint8Array) {
    if (!packet.length) return 960;
    const toc = packet[0]!;
    const frameMs = OPUS_FRAME_MS[toc >> 3] ?? 20;
    const code = toc & 3;
    const frames = code === 0 ? 1 : code === 1 || code === 2 ? 2 : packet.length > 1 ? packet[1]! & 0x3f || 1 : 1;
    return Math.max(1, Math.round(frameMs * 48 * frames));
}

function readVint(buf: Uint8Array, i: number): [number, number] | null {
    if (i >= buf.length) return null;
    const b0 = buf[i]!;
    const prefixes: [number, number][] = [[1, 0x80], [2, 0x40], [3, 0x20], [4, 0x10], [5, 0x08], [6, 0x04], [7, 0x02], [8, 0x01]];
    for (const [width, mask] of prefixes) {
        if (!(b0 & mask)) continue;
        if (i + width > buf.length) return null;
        let value = b0 & (mask - 1);
        for (let k = 1; k < width; k++) value = value * 256 + buf[i + k]!;
        return [value, width];
    }
    return null;
}

export function remuxWebmOpusToOgg(bytes: Uint8Array) {
    const muxer = new OggOpusMuxer();
    const headAt = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 512))).indexOf("OpusHead");
    if (headAt >= 0 && headAt + 19 <= bytes.length) {
        muxer.setPreSkip(new DataView(bytes.buffer, bytes.byteOffset + headAt, 19).getUint16(10, true));
    }

    let i = 0;
    while (i < bytes.length - 4) {
        if (bytes[i] !== 0xA3 && bytes[i] !== 0xA1) {
            i++;
            continue;
        }
        const vint = readVint(bytes, i + 1);
        if (!vint) {
            i++;
            continue;
        }
        const [size, sizeWidth] = vint;
        const start = i + 1 + sizeWidth;
        const track = readVint(bytes, start);
        if (!track || start + size > bytes.length) {
            i++;
            continue;
        }
        const packet = bytes.subarray(start + track[1] + 3, start + size);
        if (packet.length) muxer.writePacket(packet, opusPacketSamples(packet));
        i = start + size;
    }

    return muxer.finalize();
}

export class OggOpusMuxer {
    private readonly serial: number;
    private readonly channels: number;
    private readonly inputSampleRate: number;
    private readonly packets: { data: Uint8Array; samples: number; }[] = [];
    private preSkip = 0;

    constructor(channels = 1, inputSampleRate = SAMPLE_RATE) {
        this.channels = channels;
        this.inputSampleRate = inputSampleRate;
        this.serial = crypto.getRandomValues(new Uint32Array(1))[0]!;
    }

    setPreSkip(preSkip: number) {
        this.preSkip = preSkip;
    }

    writePacket(packet: Uint8Array, samples = 960) {
        if (!packet.length) return;
        this.packets.push({ data: packet, samples });
    }

    finalize() {
        const pages = [
            makePage(0x02, 0, this.serial, 0, [makeOpusHead(this.channels, this.preSkip, this.inputSampleRate)]),
            makePage(0, 0, this.serial, 1, [makeOpusTags()]),
        ];

        let granule = this.preSkip;
        let pageSeq = 2;
        let i = 0;
        while (i < this.packets.length) {
            const chunk = this.packets.slice(i, i + PACKETS_PER_PAGE);
            i += chunk.length;
            granule += chunk.reduce((n, packet) => n + packet.samples, 0);
            pages.push(makePage(i >= this.packets.length ? 0x04 : 0, granule, this.serial, pageSeq++, chunk.map(packet => packet.data)));
        }

        return new Blob(pages as BlobPart[], { type: OGG_OPUS_TYPE });
    }
}

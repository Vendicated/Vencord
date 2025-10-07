/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type ZipEntry = {
    name: string;
    isDirectory: boolean;
    compressedSize: number;
    size: number;
    offset: number;
    compression: number; // 0=stored, 8=deflate
};

function readLE(buf: Uint8Array, off: number, len: number) {
    let v = 0;
    for (let i = 0; i < len; i++) v |= buf[off + i] << (8 * i);
    return v >>> 0;
}

export async function unzipBlob(blob: Blob): Promise<{ entries: ZipEntry[]; readEntry: (e: ZipEntry) => Promise<ArrayBuffer>; }> {
    const buf = new Uint8Array(await blob.arrayBuffer());
    // find end of central directory (EOCD)
    const EOCD_SIG = 0x06054b50;
    let eocdOff = -1;
    for (let i = buf.length - 22; i >= 0; i--) {
        if (readLE(buf, i, 4) === EOCD_SIG) { eocdOff = i; break; }
    }

    const entries: ZipEntry[] = [];

    if (eocdOff !== -1) {
        // central directory available: read it
        const cdSize = readLE(buf, eocdOff + 12, 4);
        const cdOff = readLE(buf, eocdOff + 16, 4);

        let ptr = cdOff;
        const CDFH_SIG = 0x02014b50;
        while (ptr < cdOff + cdSize) {
            if (readLE(buf, ptr, 4) !== CDFH_SIG) break;
            const nameLen = readLE(buf, ptr + 28, 2);
            const extraLen = readLE(buf, ptr + 30, 2);
            const commentLen = readLE(buf, ptr + 32, 2);
            const compression = readLE(buf, ptr + 10, 2);
            const compressedSize = readLE(buf, ptr + 20, 4);
            const size = readLE(buf, ptr + 24, 4);
            const localHeaderOffset = readLE(buf, ptr + 42, 4);
            const nameBytes = buf.slice(ptr + 46, ptr + 46 + nameLen);
            const name = new TextDecoder().decode(nameBytes);
            entries.push({ name, isDirectory: name.endsWith("/"), compressedSize, size, offset: localHeaderOffset, compression });
            ptr += 46 + nameLen + extraLen + commentLen;
        }
    } else {
        // fallback: try to parse sequential local file headers (useful if EOCD/central dir missing or truncated)
        const LFH_SIG = 0x04034b50;
        let ptr = 0;
        while (ptr + 30 < buf.length) {
            if (readLE(buf, ptr, 4) !== LFH_SIG) {
                // try to find the next LFH
                ptr++;
                continue;
            }
            const compression = readLE(buf, ptr + 8, 2);
            const compressedSize = readLE(buf, ptr + 18, 4);
            const size = readLE(buf, ptr + 22, 4);
            const nameLen = readLE(buf, ptr + 26, 2);
            const extraLen = readLE(buf, ptr + 28, 2);
            const nameBytes = buf.slice(ptr + 30, ptr + 30 + nameLen);
            const name = new TextDecoder().decode(nameBytes);
            const dataStart = ptr + 30 + nameLen + extraLen;
            entries.push({ name, isDirectory: name.endsWith("/"), compressedSize, size, offset: ptr, compression });
            // advance past data
            ptr = dataStart + compressedSize;
        }

        if (entries.length === 0) {
            // helpful debug info for common failure modes
            try {
                const head = Array.from(buf.slice(0, 16)).map(b => b.toString(16).padStart(2, "0")).join(" ");
                console.error("ZipPreview: EOCD not found and no local file headers parsed. Buffer length:", buf.length, "head:", head);
            } catch (err) { console.error("ZipPreview: debug failed", err); }
            throw new Error("Not a zip or unsupported");
        }
    }

    async function readEntry(e: ZipEntry) {
        // read local file header to find data offset
        const LFH_SIG = 0x04034b50;
        const off = e.offset;
        if (readLE(buf, off, 4) !== LFH_SIG) throw new Error("Invalid local header at offset " + off + ". Buffer length: " + buf.length);
        const nameLen = readLE(buf, off + 26, 2);
        const extraLen = readLE(buf, off + 28, 2);
        const dataStart = off + 30 + nameLen + extraLen;
        const slice = buf.slice(dataStart, dataStart + e.compressedSize);
        if (e.compression === 0) {
            return slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        }
        // deflate: use built-in CompressionStream if available
        // deflate: prefer DecompressionStream for inflating raw deflate data
        if (typeof (DecompressionStream) !== "undefined") {
            const ds = new DecompressionStream("deflate-raw");
            const writer = ds.writable.getWriter();
            await writer.write(slice);
            await writer.close();
            const reader = ds.readable.getReader();
            const chunks: Uint8Array[] = [];
            while (true) {
                const r = await reader.read();
                if (r.done) break;
                chunks.push(new Uint8Array(r.value));
            }
            const total = chunks.reduce((s, c) => s + c.length, 0);
            const out = new Uint8Array(total);
            let pos = 0;
            for (const c of chunks) { out.set(c, pos); pos += c.length; }
            return out.buffer;
        }

        // If DecompressionStream isn't available, try the older API name (some runtimes exposed 'CompressionStream' only for compress/decompress)
        if (typeof (CompressionStream) !== "undefined" && typeof (globalThis as any).DecompressionStream === "undefined") {
            // Some environments only provide CompressionStream; try using a hack: create a Response around a blob with 'deflate-raw' content, then use 'arrayBuffer'—but this is unreliable.
            throw new Error("Deflate-compressed entries require DecompressionStream support in this environment");
        }

        throw new Error("Deflate-compressed entries require DecompressionStream support in this environment");
    }

    return { entries, readEntry };
}

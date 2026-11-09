export const FORMAT = "SplitLargeUpload";
export const MANIFEST_VERSION = 1;
export const MiB = 1024 * 1024;

const HEADROOM = 64 * 1024;

export interface ChunkInfo {
    i: number;
    name: string;
    size: number;
    sha256: string;
}

export interface Manifest {
    format: typeof FORMAT;
    v: number;
    id: string;
    name: string;
    mime: string;
    size: number;
    chunkSize: number;
    count: number;
    digest: string;
    created: number;
    chunks: ChunkInfo[];
}

export interface Chunk {
    info: ChunkInfo;
    file: File;
}

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    const units = ["KiB", "MiB", "GiB", "TiB"];
    let v = n / 1024, u = 0;
    while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
    return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[u]}`;
}

export async function sha256Hex(data: Blob | string): Promise<string> {
    const buf = typeof data === "string"
        ? new TextEncoder().encode(data)
        : await data.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}

export const safeName = (s: string) => s.replace(/[\\/:*?"<>|`\u0000-\u001f]/g, "_");

export function pickChunkSize(limitBytes: number, overrideMiB: number): number {
    const ceiling = limitBytes - HEADROOM;
    const wanted = overrideMiB > 0 ? overrideMiB * MiB : ceiling;
    return Math.max(MiB, Math.min(wanted, ceiling));
}

export async function buildChunks(
    file: File,
    chunkSize: number,
    onProgress?: (done: number, total: number) => void
): Promise<{ manifest: Manifest; chunks: Chunk[]; }> {
    const count = Math.ceil(file.size / chunkSize);
    const width = Math.max(3, String(count).length);
    const base = safeName(file.name);
    const chunks: Chunk[] = [];

    for (let i = 0; i < count; i++) {
        const blob = file.slice(i * chunkSize, Math.min((i + 1) * chunkSize, file.size));
        const name = `${base}.part${String(i + 1).padStart(width, "0")}`;
        const sha256 = await sha256Hex(blob);
        chunks.push({
            info: { i, name, size: blob.size, sha256 },
            file: new File([blob], name, { type: "application/octet-stream" })
        });
        onProgress?.(i + 1, count);
    }

    const manifest: Manifest = {
        format: FORMAT,
        v: MANIFEST_VERSION,
        id: crypto.randomUUID(),
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        chunkSize,
        count,
        digest: await sha256Hex(chunks.map(c => c.info.sha256).join("")),
        created: Date.now(),
        chunks: chunks.map(c => c.info)
    };

    return { manifest, chunks };
}

export function manifestFile(m: Manifest): File {
    return new File([JSON.stringify(m, null, 2)], `${safeName(m.name)}.slu-manifest.json`, {
        type: "application/json"
    });
}

export function headerLine(m: Manifest, which: "manifest" | number[]): string {
    const tag = `[SLU:${m.id.slice(0, 8)}]`;
    const name = `\`${safeName(m.name)}\``;
    if (which === "manifest")
        return `${tag} manifest for ${name}, ${formatBytes(m.size)} in ${m.count} parts`;
    const first = which[0] + 1, last = which[which.length - 1] + 1;
    const span = first === last ? `part ${first}` : `parts ${first}-${last}`;
    return `${tag} ${span} of ${m.count}: ${name}`;
}

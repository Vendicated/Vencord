/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DATA_DIR } from "@main/utils/constants";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises";
import { join, normalize } from "path";

const ATTACH_DIR = join(DATA_DIR, "messageLogger", "attachments");

function safeIdToPath(id: string): string | null {
    if (!/^\d+$/.test(id)) return null;
    const path = normalize(join(ATTACH_DIR, id));
    if (!path.startsWith(ATTACH_DIR)) return null;
    return path;
}

export async function writeAttachment(_, id: string, bytes: Uint8Array): Promise<void> {
    const path = safeIdToPath(id);
    if (!path) return;
    await mkdir(ATTACH_DIR, { recursive: true });
    await writeFile(path, bytes);
}

export async function readAttachment(_, id: string): Promise<Uint8Array | null> {
    const path = safeIdToPath(id);
    if (!path) return null;
    try {
        const buf = await readFile(path);
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    } catch {
        return null;
    }
}

export async function deleteAttachment(_, id: string): Promise<void> {
    const path = safeIdToPath(id);
    if (!path) return;
    try { await rm(path, { force: true }); } catch { /* ignore */ }
}

export async function listAttachments(_): Promise<{ id: string; size: number; }[]> {
    try {
        const names = await readdir(ATTACH_DIR);
        const out: { id: string; size: number; }[] = [];
        for (const name of names) {
            if (!/^\d+$/.test(name)) continue;
            try {
                const s = await stat(join(ATTACH_DIR, name));
                if (s.isFile()) out.push({ id: name, size: s.size });
            } catch { /* ignore individual stat errors */ }
        }
        return out;
    } catch {
        return [];
    }
}

export async function clearAllAttachments(_): Promise<void> {
    try { await rm(ATTACH_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
    await mkdir(ATTACH_DIR, { recursive: true });
}

/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { session } from "electron";
import { unzip } from "fflate";
import { constants as fsConstants } from "fs";
import { access, mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";

import { DATA_DIR } from "./constants";
import { crxToZip } from "./crxToZip";
import { fetchBuffer } from "./http";

const extensionCacheDir = join(DATA_DIR, "ExtensionCache");

async function extract(data: Buffer, outDir: string) {
    await mkdir(outDir, { recursive: true });
    return new Promise<void>((resolve, reject) => {
        unzip(data, (err, files) => {
            if (err) return void reject(err);
            Promise.all(Object.keys(files).map(async f => {
                // Signature stuff
                // 'Cannot load extension with file or directory name
                // _metadata. Filenames starting with "_" are reserved for use by the system.';
                if (f.startsWith("_metadata/")) return;

                if (f.endsWith("/")) return void mkdir(join(outDir, f), { recursive: true });

                const pathElements = f.split("/");
                const name = pathElements.pop()!;
                const directories = pathElements.join("/");
                const dir = join(outDir, directories);

                if (directories) {
                    await mkdir(dir, { recursive: true });
                }

                await writeFile(join(dir, name), files[f]);
            }))
                .then(() => resolve())
                .catch(err => {
                    rm(outDir, { recursive: true, force: true });
                    reject(err);
                });
        });
    });
}

export async function installExt(id: string) {
    const extDir = join(extensionCacheDir, `${id}`);

    try {
        await access(extDir, fsConstants.F_OK);
    } catch (err) {
        const url = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&x=id%3D${id}%26uc&prodversion=${process.versions.chrome}`;

        const buf = await fetchBuffer(url, {
            headers: {
                "User-Agent": `Electron ${process.versions.electron} ~ Vencord (https://github.com/Vendicated/Vencord)`
            }
        });

        await extract(crxToZip(buf), extDir)
            .catch(err => console.error(`Failed to extract extension ${id}`, err));
    }

    await session.defaultSession.loadExtension(extDir);
}

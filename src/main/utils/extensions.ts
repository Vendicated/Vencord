/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { session } from "electron";
import { unzip } from "fflate";
import { constants as fsConstants } from "fs";
import { access, mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";

import { DATA_DIR } from "./constants";
import { crxToZip } from "./crxToZip";
import { ensureSafePath } from "./ensureSafePath";
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

                if (f.includes("\0")) throw new Error(`Invalid filename: "${f}"`);

                if (f.endsWith("/")) {
                    const dir = ensureSafePath(outDir, f);
                    if (!dir) throw new Error(`Path traversal detected: "${f}"`);
                    return void await mkdir(dir, { recursive: true });
                }

                const pathElements = f.split("/");
                const directories = pathElements.slice(0, -1).join("/");

                const dir = ensureSafePath(outDir, directories);
                if (!dir) throw new Error(`Path traversal detected: "${f}"`);

                const filePath = ensureSafePath(outDir, f);
                if (!filePath) throw new Error(`Path traversal detected: "${f}"`);

                if (directories) {
                    await mkdir(dir, { recursive: true });
                }

                await writeFile(filePath, files[f]);
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
    const extDir = join(extensionCacheDir, id);

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

    if (session.defaultSession.extensions) {
        session.defaultSession.extensions.loadExtension(extDir);
    } else {
        session.defaultSession.loadExtension(extDir);
    }
}

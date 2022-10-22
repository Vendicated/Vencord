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
import { access,mkdir, rm, writeFile } from "fs/promises";
import https from "https";
import { join } from "path";

import { DATA_DIR } from "./constants";
import { crxToZip } from "./crxToZip";

const extensionCacheDir = join(DATA_DIR, "ExtensionCache");

function download(url: string) {
    return new Promise<Buffer>((resolve, reject) => {
        https.get(url, res => {
            const { statusCode, statusMessage, headers } = res;
            if (statusCode! >= 400)
                return void reject(`${statusCode}: ${statusMessage} - ${url}`);
            if (statusCode! >= 300)
                return void resolve(download(headers.location!));

            const chunks = [] as Buffer[];
            res.on("error", reject);

            res.on("data", chunk => chunks.push(chunk));
            res.once("end", () => resolve(Buffer.concat(chunks)));
        });
    });
}

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
        const url = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&x=id%3D${id}%26uc&prodversion=32`;
        const buf = await download(url);
        await extract(crxToZip(buf), extDir);
    }

    session.defaultSession.loadExtension(extDir);
}

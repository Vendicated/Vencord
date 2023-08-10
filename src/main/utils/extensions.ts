/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { session } from "electron";
import { unzip } from "fflate";
import { constants as fsConstants } from "fs";
import { access, mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";

import { DATA_DIR } from "./constants";
import { crxToZip } from "./crxToZip";
import { get } from "./simpleGet";

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
        const url = id === "fmkadmapgofadopljbjfkapdkoienihi"
            // React Devtools v4.25
            // v4.27 is broken in Electron, see https://github.com/facebook/react/issues/25843
            // Unfortunately, Google does not serve old versions, so this is the only way
            ? "https://raw.githubusercontent.com/Vendicated/random-files/f6f550e4c58ac5f2012095a130406c2ab25b984d/fmkadmapgofadopljbjfkapdkoienihi.zip"
            : `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&x=id%3D${id}%26uc&prodversion=32`;
        const buf = await get(url, {
            headers: {
                "User-Agent": "Vencord (https://github.com/Vendicated/Vencord)"
            }
        });
        await extract(crxToZip(buf), extDir).catch(console.error);
    }

    session.defaultSession.loadExtension(extDir);
}

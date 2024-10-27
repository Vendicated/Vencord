/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Upload } from "@api/MessageEvents";
import { Settings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { reverseExtensionMap } from "./components";
import definePlugin from "@utils/types";

type ExtUpload = Upload & { fixExtension?: boolean; };

export default definePlugin({
    name: "FixFileExtensions",
    authors: [EquicordDevs.thororen],
    description: "Fixes file extensions by renaming them to a compatible supported format if possible",
    patches: [
        // Taken from AnonymiseFileNames
        {
            find: "instantBatchUpload:",
            predicate: () => !Settings.plugins.AnonymiseFileNames.enabled,
            replacement: {
                match: /uploadFiles:(\i),/,
                replace:
                    "uploadFiles:(...args)=>(args[0].uploads.forEach(f=>f.filename=$self.fixExt(f)),$1(...args)),",
            },
        },
        // Also taken from AnonymiseFileNames
        {
            find: 'addFilesTo:"message.attachments"',
            predicate: () => !Settings.plugins.AnonymiseFileNames.enabled,
            replacement: {
                match: /(\i.uploadFiles\((\i),)/,
                replace: "$2.forEach(f=>f.filename=$self.fixExt(f)),$1",
            },
        }
    ],
    fixExt(upload: ExtUpload) {
        const file = upload.filename;
        const extIdx = file.lastIndexOf(".");
        const fileName = extIdx !== -1 ? file.substring(0, extIdx) : "";
        const ext = extIdx !== -1 ? file.slice(extIdx) : "";
        const newExt = reverseExtensionMap[ext] || ext;

        return fileName + newExt;
    },
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Upload } from "@api/MessageEvents";
import { Settings } from "@api/Settings";
import { tarExtMatcher } from "@plugins/anonymiseFileNames";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { ReporterTestable } from "@utils/types";

const extensionMap = {
    "ogg": [".ogv", ".oga", ".ogx", ".ogm", ".spx", ".opus"],
    "jpg": [".jpg", ".jpeg", ".jfif", ".jpe", ".jif", ".jfi", ".pjpeg", ".pjp"],
    "svg": [".svgz"],
    "mp4": [".m4v", ".m4r", ".m4p"],
    "m4a": [".m4b"],
    "mov": [".movie", ".qt"],
};

export const reverseExtensionMap = Object.entries(extensionMap).reduce((acc, [target, exts]) => {
    exts.forEach(ext => acc[ext] = `.${target}`);
    return acc;
}, {} as Record<string, string>);

type ExtUpload = Upload & { fixExtension?: boolean; };

export default definePlugin({
    name: "FixFileExtensions",
    authors: [EquicordDevs.thororen],
    description: "Fixes file extensions by renaming them to a compatible supported format if possible",
    reporterTestable: ReporterTestable.None,
    patches: [
        // Taken from AnonymiseFileNames
        {
            find: "instantBatchUpload:",
            replacement: {
                match: /uploadFiles:(\i),/,
                replace:
                    "uploadFiles:(...args)=>(args[0].uploads.forEach(f=>f.filename=$self.fixExt(f)),$1(...args)),",
            },
            predicate: () => !Settings.plugins.AnonymiseFileNames.enabled,
        },
        // Also taken from AnonymiseFileNames
        {
            find: 'addFilesTo:"message.attachments"',
            replacement: {
                match: /(\i.uploadFiles\((\i),)/,
                replace: "$2.forEach(f=>f.filename=$self.fixExt(f)),$1",
            },
            predicate: () => !Settings.plugins.AnonymiseFileNames.enabled,
        }
    ],
    fixExt(upload: ExtUpload) {
        const file = upload.filename;
        const tarMatch = tarExtMatcher.exec(file);
        const extIdx = tarMatch?.index ?? file.lastIndexOf(".");
        const fileName = extIdx !== -1 ? file.substring(0, extIdx) : "";
        const ext = extIdx !== -1 ? file.slice(extIdx) : "";
        const newExt = reverseExtensionMap[ext] || ext;

        return fileName + newExt;
    },
});

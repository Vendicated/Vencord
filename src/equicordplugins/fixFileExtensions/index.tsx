/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { tarExtMatcher } from "@plugins/anonymiseFileNames";
import { Devs } from "@utils/constants";
import definePlugin, { ReporterTestable } from "@utils/types";
import { CloudUpload } from "@vencord/discord-types";

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

export default definePlugin({
    name: "FixFileExtensions",
    authors: [Devs.thororen],
    description: "Fixes file extensions by renaming them to a compatible supported format if possible",
    reporterTestable: ReporterTestable.None,
    patches: [
        // Taken from AnonymiseFileNames
        {
            find: "async uploadFiles(",
            replacement: [
                {
                    match: /async uploadFiles\((\i)\){/,
                    replace: "$&$1.forEach($self.fixExt);"
                }
            ],
            predicate: () => !Settings.plugins.AnonymiseFileNames.enabled,
        },
    ],
    fixExt(upload: CloudUpload) {
        const file = upload.filename;
        const tarMatch = tarExtMatcher.exec(file);
        const extIdx = tarMatch?.index ?? file.lastIndexOf(".");
        const fileName = extIdx !== -1 ? file.substring(0, extIdx) : "";
        const ext = extIdx !== -1 ? file.slice(extIdx) : "";
        const newExt = reverseExtensionMap[ext] || ext;

        return fileName + newExt;
    },
});

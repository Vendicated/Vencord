/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { MouseEvent } from "react";

const Native = VencordNative.pluginHelpers.DirectFileDownload as PluginNative<typeof import("./native")>;

function saveAttachment(downloadURL: string) {
    Native.saveAttachment(downloadURL).catch(() => VencordNative.native.openExternal(downloadURL));
}

export default definePlugin({
    name: "DirectFileDownload",
    description: "Directly download files from Discord instead of opening them in the browser",
    authors: [Devs.imnotplayinginreallife],

    patches: [
        {
            find: "#{intl::DOWNLOAD}),focusProps:",
            replacement: {
                match: /\i\.\i\.getDefaultLinkInterceptor\((\i)\)/,
                replace: "event=>$self.handleDownload(event,$1)"
            }
        },
        {
            find: '"plaintext-preview-overflow-menu"',
            replacement: {
                match: /(id:"download",.{0,150}?action:\(\)=>{)(?:\i\.isPlatformEmbedded\?\i\(\):)?\i\.current\?\.click\(\)(?=,\i\(\)})/,
                replace: "$1$self.saveAttachment(arguments[0].url)"
            }
        }
    ],

    saveAttachment,

    handleDownload(event: MouseEvent, downloadURL: string) {
        if (event.defaultPrevented) {
            return;
        }

        event.preventDefault();
        saveAttachment(downloadURL);
    }
});

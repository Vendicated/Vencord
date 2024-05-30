/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

const Native = VencordNative.pluginHelpers.VirusChecker as PluginNative<typeof import("./native")>;

const settings = definePluginSettings({
    apiKey: {
        type: OptionType.STRING,
        description: "Input your VirusTotal API-Key",
        default: "null"
    },
});

export default definePlugin({
    name: "VirusChecker",
    description: "Adds a button to attachments, allowing users to scan files via VirusTotal.",
    authors: [Devs.Karfy],
    settings,

    patches: [
        {
            find: "attachmentInner,children",
            replacement: {
                match: /href:(\i).{0,100}.filesize\(\i\)}\)]}\)/,
                replace: "$&, $self.renderVirusChecker($1)"
            }
        }
    ],

    renderVirusChecker(src: string) {
        return (
            <a
                className="attachment-check-virus"
                onClick={() => checkIfVirus(src)}
                aria-label="Check file for Virus"
            >
                <this.Icon />
            </a>
        );
    },

    Icon: () => (
        <svg
            height="24"
            width="24"
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path
                d="M3.47 5.18c.27-.4.64-.74 1.1-.96l6.09-3.05a3 3 0 0 1 2.68 0l6.1 3.05A2.83 2.83 0 0 1 21 6.75v3.5a14.17 14.17 0 0 1-8.42 12.5c-.37.16-.79.16-1.16 0A14.18 14.18 0 0 1 3 9.77V6.75c0-.57.17-1.11.47-1.57Zm2.95 10.3A12.18 12.18 0 0 0 12 20.82a12.18 12.18 0 0 0 5.58-5.32A9.49 9.49 0 0 0 12.47 14h-.94c-1.88 0-3.63.55-5.11 1.49ZM12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
            />
        </svg>
    )
});

async function checkIfVirus(srcUrl: string) {
    showToast("Loading...", Toasts.Type.MESSAGE);
    const { apiKey } = settings.store;
    if (apiKey == "") {
        showToast("Please inout a valid Api-Key.", Toasts.Type.FAILURE);
        return;
    }
    try {
        let { data: { id } } = await Native.postAttachment(srcUrl, apiKey);
        try {
            let { meta: { url_info } } = await Native.getUrlId(id, apiKey);
            let test2 = url_info.id
            VencordNative.native.openExternal(`https://www.virustotal.com/gui/url/${url_info.id}/detection`);
        }
        catch (e) {
            let error = String(e.message).split("Error: ");
            showToast(error[error.length - 1], Toasts.Type.FAILURE);
            return;
        }   
    }
    catch (e) {
        let error = String(e.message).split("Error: ");
        showToast(error[error.length - 1], Toasts.Type.FAILURE);
        return;
    }
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import type { MouseEvent } from "react";

const Native = VencordNative.pluginHelpers.OpenIn as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "OpenIn",
    description: "Open discord links in Browser specified",
    authors: [Devs.Rxg3],
    settings: definePluginSettings({
        browserPath: {
            type: OptionType.STRING,
            description: "Browser path",
            default: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        }
    }),
    patches: [
        {
            find: "trackAnnouncementMessageLinkClicked({",
            replacement: {
                match: /function (\i\(\i,\i\)\{)(?=.{0,150}trusted:)/,
                replace: "async function $1 if(await $self.handleLink(...arguments)) return;"
            }
        }
    ],

    async handleLink(data: { href: string; }, event?: MouseEvent) {
        if (!data) return false;
        const url = data.href;
        if (!url) return false;

        event?.preventDefault();
        var result = await Native.openLink(url, this.settings.store.browserPath);
        if (result.error) {
            showNotification({
                title: this.name,
                body: "Failed to open in specified browser! Trying to open in default. Details: " + result.error,
                color: "#70d2ff"
            });
            window.open(url, "_blank");
        }

        return false;
    }
});

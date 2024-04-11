/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addButton, removeButton } from "@api/MessagePopover";
import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { ChannelStore } from "@webpack/common";

import { imageContextMenuPatch, messageContextMenuPatch } from "./contextMenu";
import { DownloadImagesIcon } from "./DownloadImagesIcon";
import { settings } from "./settings";

const Native = VencordNative.pluginHelpers.MediaDownloader as PluginNative<typeof import("./native")>;


export default definePlugin({
    name: "MediaDownloader",
    description: "Tool(s) to quickly save images and videos",
    authors: [Devs.Eloelle],
    settings: settings,

    start() {
        addButton("vc-imagedownload", message => {
            if (message.attachments.length === 0 && message.embeds.length === 0) return null;
            if (!settings.store.showInMessageHoverMenu) return null;
            return {
                label: "Download All Images & Videos",
                icon: DownloadImagesIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                    // console.log("Attachments:");
                    message.attachments.forEach(attachment => {
                        // console.log(attachment);
                        Native
                            .downloadFile(attachment.url, attachment.proxy_url)
                            .then(success => console.log(success))
                            .catch(error => console.log(error));
                    });
                    // console.log("Embeds:");
                    message.embeds.forEach(embed => {
                        // console.log(embed);
                        const target = embed.image || embed.video || null;
                        if (!target) return false;
                        Native
                            .downloadFile(target.url, target.proxyURL || "")
                            .then(success => console.log(success))
                            .catch(error => console.log(error));
                    });
                }
            };
        });
    },
    stop() {
        removeButton("vc-imagedownload");
    },
    contextMenus: {
        "message": messageContextMenuPatch,
        "image-context": imageContextMenuPatch
    },
    patches: [
        // Add floating download button on image attachments (it will open them in the browser)
        {
            find: "&&\"AUDIO\"",
            replacement: {
                match: /!(\w{1,3}&&)"AUDIO"===(\w{1,3}\|\|)/,
                replace: (m, z, v) => `${m}!${z}"IMAGE"===${v}`
            },
            predicate: () => settings.store.addHoverButtonToImageAttachments
        },
        // Hijack download hoverbutton to use media downloader
        {
            find: "AnalyticEvents.MEDIA_DOWNLOAD_BUTTON_TAPPED",
            replacement: {
                match: /href:(\w{1,3}),onClick:(\w{1,3}),target:(\w{1,3}),rel:(\w{1,3}),className:(\w{1,3}),"aria-label":(\w{1,3}).default.Messages.DOWNLOAD,/g,
                replace: (m, href, onClick, target, rel, classname, label) => `onClick:(e)=>$self.downloadFileSafe(${href}).then(${onClick}(e)),className:${classname},"aria-label":${label}.default.Messages.DOWNLOAD,`
            },
            predicate: () => settings.store.hijackHoverButtonForQuickDownload
        }
    ],
    downloadFileProxy(sourceURI: string, proxyURI: string) {
        return Native
            .downloadFile(sourceURI, proxyURI)
            .then(success => console.log(success))
            .catch(error => console.log(error));
    },
    downloadFileSafe(uri: string) {
        return Native
            .downloadFile(uri, uri)
            .then(success => console.log(success))
            .catch(error => console.log(error));
    },
    // TODO: Add patch for floating download button on embedded media
});

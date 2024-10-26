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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { saveFile } from "@utils/web";
import { findByPropsLazy } from "@webpack";
import { Clipboard, ComponentDispatch } from "@webpack/common";

const ctxMenuCallbacks = findByPropsLazy("contextMenuCallbackNative");

async function fetchImage(url: string) {
    const res = await fetch(url);
    if (res.status !== 200) return;

    return await res.blob();
}


const settings = definePluginSettings({
    // This needs to be all in one setting because to enable any of these, we need to make Discord use their desktop context
    // menu handler instead of the web one, which breaks the other menus that aren't enabled
    addBack: {
        type: OptionType.BOOLEAN,
        description: "Add back the Discord context menus for images, links and the chat input bar",
        // Web slate menu has proper spellcheck suggestions and image context menu is also pretty good,
        // so disable this by default. Vesktop just doesn't, so enable by default
        default: IS_VESKTOP,
        restartNeeded: true
    }
});

const MEDIA_PROXY_URL = "https://media.discordapp.net";
const CDN_URL = "cdn.discordapp.com";

function fixImageUrl(urlString: string) {
    const url = new URL(urlString);
    if (url.host === CDN_URL) return urlString;

    url.searchParams.delete("width");
    url.searchParams.delete("height");

    if (url.origin === MEDIA_PROXY_URL) {
        url.host = CDN_URL;
        url.searchParams.delete("size");
        url.searchParams.delete("quality");
        url.searchParams.delete("format");
    } else {
        url.searchParams.set("quality", "lossless");
    }

    return url.toString();
}

export default definePlugin({
    name: "WebContextMenus",
    description: "Re-adds context menus missing in the web version of Discord: Links & Images (Copy/Open Link/Image), Text Area (Copy, Cut, Paste, SpellCheck)",
    authors: [Devs.Ven],
    enabledByDefault: true,
    required: IS_VESKTOP,

    settings,

    start() {
        if (settings.store.addBack) {
            window.removeEventListener("contextmenu", ctxMenuCallbacks.contextMenuCallbackWeb);
            window.addEventListener("contextmenu", ctxMenuCallbacks.contextMenuCallbackNative);
            this.changedListeners = true;
        }
    },

    stop() {
        if (this.changedListeners) {
            window.removeEventListener("contextmenu", ctxMenuCallbacks.contextMenuCallbackNative);
            window.addEventListener("contextmenu", ctxMenuCallbacks.contextMenuCallbackWeb);
        }
    },

    patches: [
        // Add back Copy & Open Link
        {
            // There is literally no reason for Discord to make this Desktop only.
            // The only thing broken is copy, but they already have a different copy function
            // with web support????
            find: "open-native-link",
            replacement: [
                {
                    // if (IS_DESKTOP || null == ...)
                    match: /if\(!\i\.\i\|\|null==/,
                    replace: "if(null=="
                },
                // Fix silly Discord calling the non web support copy
                {
                    match: /\i\.\i\.copy/,
                    replace: "Vencord.Webpack.Common.Clipboard.copy"
                }
            ]
        },

        // Add back Copy & Save Image
        {
            find: 'id:"copy-image"',
            replacement: [
                {
                    // if (!IS_WEB || null ==
                    match: /!\i\.isPlatformEmbedded/,
                    replace: "false"
                },
                {
                    match: /return\s*?\[\i\.\i\.canCopyImage\(\)/,
                    replace: "return [true"
                },
                {
                    match: /(?<=COPY_IMAGE_MENU_ITEM,)action:/,
                    replace: "action:()=>$self.copyImage(arguments[0]),oldAction:"
                },
                {
                    match: /(?<=SAVE_IMAGE_MENU_ITEM,)action:/,
                    replace: "action:()=>$self.saveImage(arguments[0]),oldAction:"
                },
            ]
        },

        // Add back image context menu
        {
            find: 'navId:"image-context"',
            all: true,
            predicate: () => settings.store.addBack,
            replacement: {
                // return IS_DESKTOP ? React.createElement(Menu, ...)
                match: /return \i\.\i(?=\?|&&)/,
                replace: "return true"
            }
        },

        // Add back link context menu
        {
            find: '"interactionUsernameProfile"',
            predicate: () => settings.store.addBack,
            replacement: {
                match: /if\((?="A"===\i\.tagName&&""!==\i\.textContent)/,
                replace: "if(false&&"
            }
        },

        // Add back slate / text input context menu
        {
            find: 'getElementById("slate-toolbar"',
            predicate: () => settings.store.addBack,
            replacement: {
                match: /(?<=handleContextMenu\(\i\)\{.{0,200}isPlatformEmbedded)\?/,
                replace: "||true?"
            }
        },
        {
            find: ".SLASH_COMMAND_SUGGESTIONS_TOGGLED,{",
            predicate: () => settings.store.addBack,
            replacement: [
                {
                    // if (!IS_DESKTOP) return null;
                    match: /if\(!\i\.\i\)return null;/,
                    replace: ""
                },
                {
                    // Change calls to DiscordNative.clipboard to us instead
                    match: /\b\i\.\i\.(copy|cut|paste)/g,
                    replace: "$self.$1"
                }
            ]
        },
        {
            find: '"add-to-dictionary"',
            predicate: () => settings.store.addBack,
            replacement: {
                match: /let\{text:\i=""/,
                replace: "return [null,null];$&"
            }
        },

        // Add back "Show My Camera" context menu
        {
            find: '"MediaEngineWebRTC");',
            replacement: {
                match: /supports\(\i\)\{switch\(\i\)\{(case (\i).\i)/,
                replace: "$&.DISABLE_VIDEO:return true;$1"
            }
        },
        {
            find: ".Messages.SEARCH_WITH_GOOGLE",
            replacement: {
                match: /\i\.isPlatformEmbedded/,
                replace: "true"
            }
        },
        {
            find: ".Messages.COPY,hint:",
            replacement: [
                {
                    match: /\i\.isPlatformEmbedded/,
                    replace: "true"
                },
                {
                    match: /\i\.\i\.copy/,
                    replace: "Vencord.Webpack.Common.Clipboard.copy"
                }]
        },
        // Automod add filter words
        {
            find: '("interactionUsernameProfile',
            replacement:
                {
                    match: /\i\.isPlatformEmbedded(?=.{0,50}\.tagName)/,
                    replace: "true"
                },
        }
    ],

    async copyImage(url: string) {
        url = fixImageUrl(url);

        let imageData = await fetch(url).then(r => r.blob());
        if (imageData.type !== "image/png") {
            const bitmap = await createImageBitmap(imageData);

            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            canvas.getContext("2d")!.drawImage(bitmap, 0, 0);

            await new Promise<void>(done => {
                canvas.toBlob(data => {
                    imageData = data!;
                    done();
                }, "image/png");
            });
        }

        if (IS_VESKTOP && VesktopNative.clipboard) {
            VesktopNative.clipboard.copyImage(await imageData.arrayBuffer(), url);
            return;
        } else {
            navigator.clipboard.write([
                new ClipboardItem({
                    "image/png": imageData
                })
            ]);
        }
    },

    async saveImage(url: string) {
        url = fixImageUrl(url);

        const data = await fetchImage(url);
        if (!data) return;

        const name = new URL(url).pathname.split("/").pop()!;
        const file = new File([data], name, { type: data.type });

        saveFile(file);
    },

    copy() {
        const selection = document.getSelection();
        if (!selection) return;

        Clipboard.copy(selection.toString());
    },

    cut() {
        this.copy();
        ComponentDispatch.dispatch("INSERT_TEXT", { rawText: "" });
    },

    async paste() {
        const clip = (await navigator.clipboard.read())[0];
        if (!clip) return;

        const data = new DataTransfer();
        for (const type of clip.types) {
            if (type === "image/png") {
                const file = new File([await clip.getType(type)], "unknown.png", { type });
                data.items.add(file);
            } else if (type === "text/plain") {
                const blob = await clip.getType(type);
                data.setData(type, await blob.text());
            }
        }

        document.dispatchEvent(
            new ClipboardEvent("paste", {
                clipboardData: data
            })
        );
    }
});

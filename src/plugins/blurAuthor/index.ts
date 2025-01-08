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

import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { patchMessageContextMenu } from "./context";

let style: HTMLStyleElement;

function setCss() {
    style.textContent = `
        .vc-blur-author [class^=imageWrapper] :is(img, video) {
            filter: blur(${Settings.plugins.BlurAuthor.blurAmount}px);
            transition: filter 0.2s;
        }

        .vc-blur-author [class^="wrapper"]:not([class^="wrapperPaused"]) :is(img, video),
        .vc-blur-author [class^="imageWrapper"]:hover :is(img, video) {
            filter: unset;
        }`;
}

const settings = definePluginSettings({
    blurAmount: {
        type: OptionType.NUMBER,
        description: "Blur Amount",
        default: 10,
        onChange: setCss
    },
    userBlacklist: {
        type: OptionType.STRING,
        description: "User Blacklist (Comma Separated User-IDs)",
        placeholder: "261607958822125568,865521228859706162",
        isValid: (ids: string) => {
            if (!!!ids || !ids.trim().length) return true;

            if (/^(?:\d{18})(?:,\s?\d{18})*$/.test(ids)) return true;
            else return "Please ensure the User IDs are valid and separated correctly!";
        }
    }
});

const hasUser = (id: string): boolean => {
    return Settings.plugins.BlurAuthor.userBlacklist.includes(id);
};

const onClick = (id: string): void => {
    if (hasUser(id)) {
        Settings.plugins.BlurAuthor.userBlacklist = Array.from(Settings.plugins.BlurAuthor.userBlacklist.split(",")).filter((_id: string) => (_id != id && _id.length > 0));
    } else {
        // Even if this is the first entry, it will not break anything by having a leading comma.
        Settings.plugins.BlurAuthor.userBlacklist += `,${id}`;
    }
    setCss();
};

export default definePlugin({
    name: "BlurAuthor",
    description: "Blur attachments from a specific user(s) until hovered",
    authors: [Devs.Ven, Devs.notmrtoby], // Adds some additions to Ven's BlurNSFW
    settings,
    contextMenus: {
        "user-context": patchMessageContextMenu(hasUser, onClick)
    },

    patches: [
        {
            find: ".embedWrapper,embed",
            replacement: [{
                match: /\.container/,
                replace: "$&+($self.hasUser(this.props.message.author.id) ? ' vc-blur-author' : '')"
            }]
        }
    ],

    hasUser: (id: string): boolean => {
        return hasUser(id);
    },

    start() {
        style = document.createElement("style");
        style.id = "VcBlurAuthor";
        document.head.appendChild(style);

        setCss();
    },

    stop() {
        style?.remove();
    }
});

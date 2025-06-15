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
import { React } from "@webpack/common";

const settings = definePluginSettings({
    source: {
        description: "Source to display in ban modal (Video or GIF)",
        type: OptionType.STRING,
        default: "https://i.imgur.com/O3DHIA5.gif",
        restartNeeded: false,
    },
    width: {
        description: "Width of the media element (pixels)",
        type: OptionType.NUMBER,
        default: 400,
        restartNeeded: false,
    },
    autoplay: {
        description: "Auto-play videos (only applies to video files)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
    },
    moveTitle: {
        description: "Move the ban title to the modal header",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
    }
});

export default definePlugin({
    name: "BetterBanModal",
    description: "Reintroduces customizable media (video/GIF) to the Discord ban modal and optionally moves the title to the header",
    authors: [Devs.crepnf],
    settings,

    patches: [
        // Target the ban modal main content container and inject media
        {
            find: "#{intl::tamLhY::raw}", // Suspicious or spam account
            replacement: {
                // Inject media at the beginning of main content
                match: /(gap:24,children:\[)/,
                replace: "$1$self.renderBanMedia(),"
            }
        },
        // Move the ban title to the modal header
        {
            find: "g.t.jeKpoq", // Ban user text
            replacement: [
                {
                    // Replace the header to include the title alongside the close button
                    match: /(\(0,l\.jsx\)\(s\.xBx,{separator:!1,children:\(0,l\.jsx\)\(s\.olH,{className:v\.closeIcon,onClick:k}\)}\))/,
                    replace: "(0,l.jsxs)(s.xBx,{separator:!1,children:[(0,l.jsx)(s.X6q,{variant:\"heading-lg/semibold\",color:\"text-primary\",children:U}),(0,l.jsx)(s.olH,{className:v.closeIcon,onClick:k})]})"
                },
                {
                    // Remove the original title section from the body content
                    match: /\(0,l\.jsxs\)\(s\.Kqy,{direction:"vertical",gap:8,children:\[\(0,l\.jsx\)\(s\.X6q,{variant:"heading-lg\/semibold",color:"text-primary",children:U}\)[^\]]*\]\}\),/,
                    replace: ""
                }
            ],
            predicate: () => settings.store.moveTitle
        }
    ],

    renderBanMedia() {
        const { source, width, autoplay } = settings.store;

        if (!source) return null;

        const isVideo = /\.(mp4|webm|mov|avi)(\?.*)?$/i.test(source);

        const style = {
            maxWidth: "100%",
            height: "auto",
            borderRadius: "8px",
            display: "block"
        };

        try {
            if (isVideo) {
                return React.createElement("video", {
                    key: "banger-video",
                    src: source,
                    width: width,
                    autoPlay: autoplay,
                    loop: true,
                    muted: true,
                    style: style,
                    onError: (e: any) => {
                        console.warn("BetterBanModal: Failed to load video", e);
                        e.target.style.display = "none";
                    }
                });
            } else {
                return React.createElement("img", {
                    key: "banger-image",
                    src: source,
                    width: width,
                    alt: "Ban media",
                    style: style,
                    onError: (e: any) => {
                        console.warn("BetterBanModal: Failed to load image", e);
                        e.target.style.display = "none";
                    }
                });
            }
        } catch (error) {
            console.error("BetterBanModal: Error rendering ban media:", error);
            return null;
        }
    }
});

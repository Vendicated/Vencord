/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import definePlugin from "@utils/types";

// feel free to improve, i just made this for me & my friends

function isSeparator(char) {
    return char === ' ' || char === ',' || char === ';' || char === '\n' || char === '\t';
}

export default definePlugin({
    name: "AutoVX",
    description: "Inserts vx before common links",
    authors: [Devs.ssno],

    start() {
        this.pre_send = addPreSendListener(async (id, mobj, ex) => {
            let p_content = mobj.content;

            const common_urls = ["tiktok", "twitter", "x"];

            // gather all https substrings
            const prefix = "https://"; // todo maybe support http? 
            const https_strings = [{ url: "", pos: 0 }];
            let pos = p_content.indexOf(prefix);

            // gather all the urls
            while (pos !== -1) {
                let s = pos;
                let e = s + prefix.length;

                while (e < p_content.length && !isSeparator(p_content[e])) {
                    e++;
                }

                const u = p_content.slice(s, e);
                https_strings.push({ url: u, pos: s });
                pos = p_content.indexOf(prefix, e);
            }

            // replace them
            https_strings.reverse().forEach(({ url, pos }) => {
                const isCommonUrl = common_urls.some(keyword => url.includes(keyword));

                if (isCommonUrl && !url.includes("https://vx") && !url.includes("https://www.vx")) {
                    let replacement;

                    if (url.includes("x.com")) {
                        replacement = url.replace(/x\.com/, "vxtwitter.com");
                    } else if (url.includes("www.")) {
                        replacement = url.replace("https://www.", "https://www.vx");
                    } else {
                        replacement = "https://vx" + url.slice(prefix.length);
                    }

                    p_content = p_content.slice(0, pos) + replacement + p_content.slice(pos + url.length);
                }
            });


            mobj.content = p_content;

            return { cancel: false };
        });
    },

    end() {
        removePreSendListener(this.pre_send);
    }
});
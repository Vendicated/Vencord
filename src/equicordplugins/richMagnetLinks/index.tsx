/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    authors: [EquicordDevs.cassie, EquicordDevs.mochienya, EquicordDevs.secp192k1],
    name: "RichMagnetLinks",
    description: "Renders magnet links like message links",
    patches: [
        {
            find: "AUTO_MODERATION_SYSTEM_MESSAGE_RULES:",
            replacement: {
                match: /mention:\{order:(\i\.\i\.order)/,
                replace: "magnet:$self.magnetLink($1),$&"
            }
        },
        {
            find: '"flattenMarkdown"',
            replacement: {
                match: /mention:{type:/,
                replace: "magnet:{type:\"inlineObject\"},$&",
            }
        },
    ],
    magnetLink: (order: number) => ({
        order,
        requiredFirstCharacters: ["magnet:?"],
        match(content: string) {
            return /^magnet:\?[\w\W]+?(?=\s|$)/.exec(content);
        },
        parse(matchedContent: RegExpExecArray, _, parseProps: Record<string, any>) {
            // Don't run when typing/editing message
            if (!parseProps.messageId || parseProps.isInsideOfLink) return {
                type: "text",
                content: matchedContent[0]
            };

            const magnetLink = matchedContent[0];
            let filename = "unknown filename";

            try {
                const searchPart = magnetLink.split("?")[1];
                if (searchPart) {
                    const params = new URLSearchParams(searchPart);
                    const dn = params.get("dn");
                    if (dn) {
                        filename = decodeURIComponent(dn.replace(/\+/g, " "));
                    }
                }
            } catch (err) {
                console.error("Failed to parse magnet link", err);
            }

            return { type: "magnet", filename, magnetLink };
        },
        react({ magnetLink, filename }) {
            return <a href={magnetLink} className="vc-magnet-link interactive">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M15 12h-4v3h4zM5 12H1v3h4zM0 8a8 8 0 1 1 16 0v8h-6V8a2 2 0 1 0-4 0v8H0z"></path>
                </svg>
                {filename}
            </a>;
        }
    })
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "TidalEmbeds",
    description: "Embeds TIDAL songs to make them playable in Discord.",
    authors: [EquicordDevs.vmohammad],
    dependencies: ["MessageUpdaterAPI"],
    patches: [
        {
            find: "}renderEmbeds(",
            replacement: {
                match: /(?<=renderEmbeds\(\i\){.+?embeds\.map\(\((\i),\i\)?=>{)/,
                replace: "$&if($self.isTidalEmbed($1))return null;"
            }
        }
    ],

    isTidalEmbed(embed) {
        return [
            "https://tidal.com/album",
            "https://tidal.com/track",
            "https://tidal.com/browse/album",
            "https://tidal.com/browse/track"
        ].some(prefix => embed?.url?.startsWith?.(prefix));
    },

    renderMessageAccessory({ message }) {
        const tidalEmbed = message.embeds?.find(embed => this.isTidalEmbed(embed));
        if (!tidalEmbed) return null;

        const { url } = tidalEmbed;
        const match = url.match(/\/(album|track)\/([0-9]+)/);
        if (!match || !match[2]) return null;

        const isAlbum = match[1] === "album";
        const id = match[2];
        const width = isAlbum ? 700 : 400;
        const height = isAlbum ? 300 : 100;
        const src = `https://embed.tidal.com/${isAlbum ? "albums" : "tracks"}/${id}?disableAnalytics=true`;
        return (
            <div className="tidal-embed">
                <iframe
                    src={src}
                    width={width}
                    height={height}
                    allow="encrypted-media"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    title="TIDAL Embed Player"
                />
            </div>
        );
    }
});

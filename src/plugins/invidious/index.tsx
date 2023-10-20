/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Component } from "react";

interface Props {
    embed: {
        provider?: {
            name: string;
        };
        video: {
            url: string;
        };
    };
}

const embedUrlRe = /https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/;

async function embedDidMount(this: Component<Props>) {
    const { embed } = this.props;
    if (!embed || embed.provider?.name !== "YouTube" || !embed.video?.url) return;

    const videoId = embedUrlRe.exec(embed.video.url)?.[1];
    this.props.embed.video.url = "https://yewtu.be/embed/" + videoId;
    this.forceUpdate();
}

export default definePlugin({
    name: "Invidious",
    description: "Makes YouTube embeds use Invidious instead of the default YouTube embed.",
    authors: [Devs.toonlink],

    embedDidMount,
    patches: [{
        find: "this.renderInlineMediaEmbed",
        replacement: [
            {
                match: /(\i).render=function.{0,50}\i\.embed/,
                replace: "$1.componentDidMount=$self.embedDidMount,$&"
            },
        ]
    }],
});

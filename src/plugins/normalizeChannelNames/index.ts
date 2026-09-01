/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NormalizeChannelNames",
    description:
        "Normalize channel names to find channels with unicode characters",
    authors: [Devs.MVDW_Java],
    patches: [
        {
            find: ",queryChannels(",
            group: true,
            replacement: [
                {
                    match: /(\i)\.toLocaleLowerCase\(\);return{queryLower/,
                    replace: "$self.normalize($1);return{queryLower",
                },
                {
                    match: /(\i)=(\i)\.name\.toLocaleLowerCase\(\),/,
                    replace: "$1=$self.normalize($2.name),",
                },
            ],
        },
    ],

    normalize: (text: string) =>
        text
            .normalize("NFKD")
            .toLowerCase()
            .replace(/[\u0300-\u036f]/g, ""),
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

function normalizeText(text: string): string {
    if (!text) return "";
    return text
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "");
}

export default definePlugin({
    name: "NormalizeChannelNames",
    description:
        "Normalize channel names to find channels with unicode characters",
    authors: [Devs.MVDW_Java],
    patches: [
        {
            find: "queryChannels(e){",
            replacement: [
                {
                    match: /m=e5\((\i),(\i)\)/,
                    replace: "m=e5($self.normalizeText($1),$2)",
                },
                {
                    match: /i=e\.name\.toLocaleLowerCase\(\)/,
                    replace: "i=$self.normalizeText(e.name)",
                },
            ],
        },
    ],

    normalizeText,
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

async function getcutepats(): Promise<string> {
    const res = await fetch("https://api.waifu.pics/sfw/pat");
    const url = (await res.json()).url as string;
    return url;
}



export default definePlugin({
    name: "CutePats",
    authors: [EquicordDevs.thororen],
    description: "Sending Head Pats",
    commands: [{
        name: "pat",
        description: "Sends a headpat gif",
        execute: async opts => ({
            content: await getcutepats()
        })
    }]
});

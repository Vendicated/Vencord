/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

async function getcutepats(): Promise<string> {
    // Indi wants bad things
    const res = await fetch("https://api.waifu.pics/sfw/pat");
    const url = (await res.json()).url as string;
    return url;
}



export default definePlugin({
    name: "CutePats",
    authors: [EquicordDevs.thororen],
    description: "Pat Command",
    commands: [{
        name: "pat",
        description: "Baby don't hurt me no more",
        execute: async opts => ({
            content: await getcutepats()
        })
    }]
});

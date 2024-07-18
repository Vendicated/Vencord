/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import axios from "axios";


async function getcuteneko(): Promise<string> {
    const res = (await axios.get("https://nekos.best/api/v2/neko")).data;
    const url = (await res.json()).results[0].url as string;
    return url;
}



export default definePlugin({
    name: "Cute nekos",
    authors: [Devs.echo],
    description: "Neko Command",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "nekos",
        description: "Baby don't hurt me no more",
        execute: async opts => ({
            content: await getcuteneko()
        })
    }]
});

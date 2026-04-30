/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 August/coopeeo, Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


const connectionLinks: connectionLink[] = [
    {
        name: "Xbox",
        uri: "https://www.xbox.com/play/user/${name}",
    },
    {
        name: "Epic Games",
        uri: "https://store.epicgames.com/u/${id}",
    }
];

interface connectionLink {
    /**
     * The name of the connection (as in Discord)
     */
    name: string;
    /**
     * The uri to use.
     * There are also two variables that you can use, name and id.
     * The "name" is the name of the account connected (what is shown visually in Discord).
     * The "id" is the identifier of the account connected, the id could be unrelated to the actual account depending on the service connected.
     * Make sure to use "" and not `` so the ${} doesnt escape for an actual variable
     */
    uri: string;
}

export default definePlugin({
    name: "ExtraConnectionLinks",
    description: "Allows you to open more connections in browser!",
    authors: [Devs.coopeeo],
    patches: connectionLinks
        .map(link => {
            return {
                find: "getPlatformUserUrl:",
                replacement: {
                    match: new RegExp(`(?<=${link.name}",.*},.+)(?=},)`),
                    replace: `, getPlatformUserUrl:e=>{let {name, id} = e; return \`${link.uri}\`;}`
                }
            };
        }),
});

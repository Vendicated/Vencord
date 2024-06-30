/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Cooper/coopeeo, Vendicated and contributors*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

//* platforms that dont open
//* riot and leage (can't view profiles)
//* epic (can't view profiles)
//* psn (can't view profiles but I have a workaround for 3rd party stuff)
//* roblox
//* xbox
//* battle.net (can't view profiles)

const uris = { // name = t, and id = l
    roblox: "https://www.roblox.com/users/${l}/profile",
    xbox: "https://www.xbox.com/play/user/${t}"
};
export default definePlugin({
    name: "OpenMoreConnections",
    description: "Adds the Open Profile button to connections that don't natively have it in the regular Discord client. Supported Platforms: Xbox, and Roblox. Planned Platforms: PSN. Platforms that will never be supported: Riot Games/League of Legends, Battle.net, and Epic Games",
    authors: [Devs.coopeeo],
    patches: [
        {
            find: "getPlatformUserUrl:e=>",
            replacement: {
                match: /(?<=Roblox",.*},.+)(?=},)/,
                replace: `, getPlatformUserUrl:e=>{let {name:t, id:l} = e; return \`${uris.roblox}\`;}`
            }
        },
        {
            find: "getPlatformUserUrl:e=>",
            replacement: {
                match: /(?<=Xbox",.*},.+)(?=},)/,
                replace: `, getPlatformUserUrl:e=>{let {name:t, id:l} = e; return \`${uris.xbox}\`;}`
            }
        }
    ],
});

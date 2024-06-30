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

enum ConnectionType {
    Roblox = "roblox",
    PSN = "playstation",
    Xbox = "xbox",
}


interface Connection {
    type: ConnectionType | string;
    id: string;
    name: string;
    verified: boolean;
}


export default definePlugin({
    name: "OpenMoreConnections",
    description: "Adds the Open Profile button to connections that don't natively have it in the regular Discord client. Supported Platforms: Xbox, and Roblox. Planned Platforms: PSN. Platforms that will never be supported: Riot Games/League of Legends, Battle.net, and Epic Games",
    authors: [Devs.coopeeo],
    patches: [
        {
            find: ".CONNECTED_ACCOUNT_VIEWED,",
            replacement: {
                match: /(?<=(\i)=null==\i\?void 0:null===\(\i=\i.getPlatformUserUrl\)\|\|void 0===\i\?void 0:\i.call\(\i,(\i)\);)/,
                replace: "if ($1 == null) $1 = $self.addConnectionLink($2);"
            }
        }
    ],
    addConnectionLink(con: Connection) {
        switch (con.type) {
            case ConnectionType.Roblox:
                return `https://www.roblox.com/users/${con.id}/profile`;
            case ConnectionType.Xbox:
                return `https://www.xbox.com/en-US/play/user/${con.name}`;
        }


        return null;
    }
});

/*
* Vencord, a Discord client mod
* Copyright (c) 2024 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import definePlugin from "@utils/types";

export default definePlugin({
    name: "Bigger Upload",
    description: "Reverts the free upload size limit back to 25MB",
    authors: [{ name: 'Kaydax', id: 142782417994907648n }],
    patches: [
        {
            find: 'GLOBAL_DISCOVERY:"/discovery"',
            replacement: {
                match: /10485760/,
                replace: '26214400'
            }
        },
        {
            find: 'client_build_number',
            replacement: {
                match: /client_build_number=[a-zA-Z]+/,
                replace: 'client_build_number=10000'
            }
        }
    ]
});

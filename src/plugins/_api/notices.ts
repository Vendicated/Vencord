/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoticesAPI",
    description: "Fixes notices being automatically dismissed",
    authors: [Devs.Ven],
    required: true,
    patches: [
        {
            find: 'displayName="NoticeStore"',
            replacement: [
                {
                    match: /(?=;\i=null;.{0,70}getPremiumSubscription)/g,
                    replace: ";if(Vencord.Api.Notices.currentNotice)return false"
                },
                {
                    match: /(?<=,NOTICE_DISMISS:function\(\i\){)(?=if\(null==(\i)\))/,
                    replace: (_, notice) => `if(${notice}.id=="VencordNotice")return(${notice}=null,Vencord.Api.Notices.nextNotice(),true);`
                }
            ]
        }
    ],
});

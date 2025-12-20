/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
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
            find: '"NoticeStore"',
            replacement: [
                {
                    match: /(?<=!1;)\i=null;(?=.{0,80}getPremiumSubscription\(\))/g,
                    replace: "if(Vencord.Api.Notices.currentNotice)return false;$&"
                },

                // FIXME(Bundler minifier change related): Remove the non used compability once enough time has passed
                {
                    match: /(?<=,NOTICE_DISMISS:function\(\i\){)return null!=(\i)/,
                    replace: (m, notice) => `if(${notice}?.id=="VencordNotice")return(${notice}=null,Vencord.Api.Notices.nextNotice(),true);${m}`,
                    noWarn: true,
                },
                {
                    match: /(?<=function (\i)\(\i\){)return null!=(\i)(?=.+?NOTICE_DISMISS:\1)/,
                    replace: (m, _, notice) => `if(${notice}?.id=="VencordNotice")return(${notice}=null,Vencord.Api.Notices.nextNotice(),true);${m}`
                }
            ]
        }
    ],
});

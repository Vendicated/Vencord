/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { _renderNotice, VENCORD_NOTICE_TYPE } from "@api/Notices";
import ErrorBoundary from "@components/ErrorBoundary";
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
                    match: /(?<=!1(?:;|}))\i=null;(?=.{0,80}getPremiumSubscription\(\))/g,
                    replace: "if(Vencord.Api.Notices.currentNotice)return false;$&"
                },
                {
                    match: /(?<=,NOTICE_DISMISS:function\(\i\){)return null!=(\i)/,
                    replace: (m, notice) => `if(${notice}?.type=="${VENCORD_NOTICE_TYPE}")return(${notice}=null,Vencord.Api.Notices.nextNotice(),true);${m}`
                }
            ]
        },
        {
            find: ".GLOBAL_BANNER_PREVIEW:return",
            replacement: {
                match: /switch\((\i)\.type\){(?=case \i\.\i\.GLOBAL_BANNER_PREVIEW:)/,
                replace: `$&case "${VENCORD_NOTICE_TYPE}":return $self.renderNotice($1);`
            }
        }
    ],

    renderNotice: ErrorBoundary.wrap(_renderNotice, { noop: true })
});

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

import { migratePluginSettings } from "../api/settings";
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

migratePluginSettings("NoticesAPI", "NoticesApi");

export default definePlugin({
    name: "NoticesAPI",
    description: "Fixes notices being automatically dismissed",
    authors: [Devs.Ven],
    required: true,
    patches: [
        {
            find: "updateNotice:",
            replacement: [
                {
                    match: /;(.{1,2}=null;)(?=.{0,50}updateNotice)/g,
                    replace:
                        ";if(Vencord.Api.Notices.currentNotice)return !1;$1"
                },
                {
                    match: /(?<=NOTICE_DISMISS:function.+?){(?=if\(null==(.+?)\))/,
                    replace: '{if($1?.id=="VencordNotice")return ($1=null,Vencord.Api.Notices.nextNotice(),true);'
                }
            ]
        }
    ],
});

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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    mode: {
        description: "Content to show",
        type: OptionType.SELECT,
        options: [
            {
                label: "Name and content",
                value: 0,
                default: true,
            },
            {
                label: "Name only",
                value: 1,
            },
            {
                label: "No name or content",
                value: 2,
            },
        ],
    },
});

export default definePlugin({
    name: "NotificationContent",
    description: "Customize notification content",
    authors: [Devs.slonkazoid],
    settings,

    process(
        icon: string,
        title: string,
        body: string
    ): { icon?: string; title: string; body: string } {
        console.log("hi");
        return {
            icon: settings.store.mode !== 2 ? icon : undefined,
            title: settings.store.mode !== 2 ? title : "Discord",
            body: settings.store.mode === 0 ? body : "New message",
        };
    },

    patches: [
        {
            find: "showNotification:function",
            replacement: {
                match: /(showNotification:function\((\i),(\i),(\i),\i,\i\){)/,
                replace:
                    "$1let processed = $self.process($2, $3, $4); $2 = processed.icon; $3 = processed.title; $4 = processed.body;",
            },
        },
    ],
});

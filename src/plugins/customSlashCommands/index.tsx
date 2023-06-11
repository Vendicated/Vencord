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

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { definePluginSettings, PlainSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import { CustomSettingsModal, regCmd } from "./Components/CustomTextInput";

const settings = definePluginSettings({
    menu: {
        type: OptionType.COMPONENT,
        description: "",
        component: () =>
            <CustomSettingsModal/>
    },
});

export default definePlugin({
    name: "CustomSlashCommands",
    description: "Create your customized Slash Commands",
    authors: [{ name: "stasiek", id: BigInt(1075800558667051079n) }],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "return",
            description: "Sends message",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [],
            execute: (_, ctx) => {
                sendBotMessage(ctx.channel.id, {
                    content: "returned"
                });
                return;
            }
        }
    ],
    settings,

    start() {
        if (Object.keys(PlainSettings.plugins.CustomSlashCommands.commands).length > 0) {
            Object.entries(PlainSettings.plugins.CustomSlashCommands.commands).forEach(([k, v]) => {
                regCmd(v.name, v.description, v.returnMessage, v.sendToChat);
            });
        }
    }
});

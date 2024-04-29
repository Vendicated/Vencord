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
import "./style.css";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "discord-types/general";
import { init, getUserPFP, addUser, removeUser, hasUser } from "./data";
import { ApplicationCommandInputType, findOption, OptionalMessageOption, RequiredMessageOption, sendBotMessage, ApplicationCommandOptionType, Argument, CommandContext } from "@api/Commands";
import { Devs } from "@utils/constants";
import { contextMenus } from "./contextMenu.tsx";
import { openModal } from "./createUserModal.tsx";



function pfp(cmd: string, id: string, pfp: string) {
    console.log(cmd + " " + id + " " + pfp);
    if (cmd == "add") {
        const user = {
            id: id,
            profilepic: pfp
        };
        addUser(user);
    } else if (cmd == "remove") {
        removeUser(id);
    }
}

export default definePlugin({
    name: "CustomPFP",
    description: "Allows you to set custom pfp to any user.",
    authors: [Devs.Luca99],
    contextMenus,
    patches: [
        // default export patch
        {
            find: "getUserAvatarURL:",
            replacement: [
                {
                    match: /(getUserAvatarURL:)(\i),/,
                    replace: "$1$self.getAvatarHook($2),"
                },
                {
                    match: /(getUserAvatarURL:\i\(\){return )(\i)}/,
                    replace: "$1$self.getAvatarHook($2)}"
                }
            ]
        }
    ],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "add pfp",
            description: "changes the profile pic of someone",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [{
                name: "User ID",
                type: 3,
                description: "The id of the user you want to add",
                required: true
            }, {
                name: "Profile picture",
                type: 3,
                description: "The link of the picture you want to add",
                required: true
            }],
            execute: async (option, ctx) => {
                pfp("add", option[0].value, option[1].value);
            },
        },
        {
            name: "remove pfp",
            description: "removes the profile picture reverting it back to normal",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [{
                name: "User ID",
                type: 3,
                description: "The id of the user you want to remove the pfp from",
                required: true
            }],
            execute: async (option, ctx) => {
                pfp("remove", option[0].value);
            }
        }
    ],

    getAvatarHook: (original: any) => (user: User, animated: boolean, size: number) => {
        if (user.avatar?.startsWith("a_")) return original(user, animated, size);
        return getUserPFP(user.id) ?? original(user, animated, size);
    },

    async start() {
        await init();
    },

});

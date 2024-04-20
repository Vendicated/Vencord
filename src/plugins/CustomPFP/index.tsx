
import definePlugin, { OptionType } from "@utils/types";
import { User } from "discord-types/general";
import { init, getUserPFP, addUser, removeUser, hasUser } from "./data"
import { ApplicationCommandInputType, findOption, OptionalMessageOption, RequiredMessageOption, sendBotMessage, ApplicationCommandOptionType, Argument, CommandContext } from "@api/Commands";


export default definePlugin({
    data,
    name: "CustomPFP",
    description: "Allows you to set custom pfp to any user.",
    authors: [{id: 1207731371884150804n, name: "Luca99"}],
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
                const user = {
                    id = option[0].value,
                    profilepic = option[1].value

                }
                addUser(user)
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
                    removeUser(option[0].value)
                }
        }
    ],

    getAvatarHook: (original: any) => (user: User, animated: boolean, size: number) => {
        if (user.avatar?.startsWith("a_")) return original(user, animated, size);
        return getUserPFP(user.id) ?? original(user, animated, size);
    },

    async start() {
        await init()
    },
});

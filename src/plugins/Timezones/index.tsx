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


import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React } from "@webpack/common";
import { Message, User } from "discord-types/general";

import { getTimeString, getUserTimezone, Timezone } from "./Utils";
const styles = findByPropsLazy("timestampInline");

export default definePlugin({
    name: "Timezones",
    description: "Shows the timezones of users",
    authors: [Devs.mantikafasi],
    options: {
        use24hr: {
            type: OptionType.BOOLEAN,
            description: "Use 24h format",
            default: true,
        },

        showTimezonesInChat: {
            type: OptionType.BOOLEAN,
            description: "Show timezones in chat",
            default: true,
        },

        showTimezonesInProfile: {
            type: OptionType.BOOLEAN,
            description: "Show timezones in profile",
            default: true,
        },
    },
    commands: [
        {
            name: "settimezone",
            description: "Set a users timezone",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "user",
                    description: "User to set timezone for",
                    type: ApplicationCommandOptionType.USER,
                },
                {
                    name: "timezone",
                    description: "Timezone to set (+3, -5, etc.)",
                    type: ApplicationCommandOptionType.STRING,
                }


            ],
            execute(args, ctx) {
                const user = findOption(args, "user");
                const timezone = findOption(args, "timezone");
                Vencord.Settings.plugins.Timezones[`timezones.${user}`] = timezone;
                sendBotMessage(ctx.channel.id, {content: "Timezone set"});
            },
        },
        {
            name: "deletetimezone",
            description: "Delete a users timezone",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "user",
                    description: "User to delete timezone for",
                    type: ApplicationCommandOptionType.USER,
                },
            ],
            execute(args, ctx) {
                const user = findOption(args, "user");
                if (!Vencord.Settings.plugins.Timezones[`timezones.${user}`]) {
                    sendBotMessage(ctx.channel.id, {content: "No timezone"});
                    return;
                }
                delete Vencord.Settings.plugins.Timezones[`timezones.${user}`];
                sendBotMessage(ctx.channel.id, {content: "Timezone deleted"});
            }
        },
        {
            name: "gettimezones",
            description: "Get all timezones",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute(args, ctx) {
                const timezones = Vencord.Settings.plugins.Timezones;
                let str = Object.entries(timezones).filter(t => t.toString().startsWith("timezones.")).map(([user, timezone]) => `<@${user.slice(10)}>: ${timezone}`).join("\n");

                if (str.length === 0) {
                    str = "No timezones set";
                }
                sendBotMessage(ctx.channel.id, {content:str});
            }
        }
    ],

    patches: [
        {
            find: "showCommunicationDisabledStyles",
            replacement: {

                match: /(?<=return\s*\(0,\w{1,3}\.jsxs?\)\(.+!\w{1,3}&&)(\[{0,1}\(0,\w{1,3}.jsxs?\)\(.+?\{.+?\}\)*\]{0,1})/,
                // DONT EVER ASK ME HOW THIS WORKS I DONT KNOW EITHER I STOLE IT FROM TYMEN
                replace: "[$1, Vencord.Plugins.plugins.Timezones.getTimezonesComponent(e)]"
            },
        },
        {
            find: "().popoutNoBannerPremium",
            replacement: {
                match: /return(\(0,.\.jsx\)\(.\..,\{.*\}\))/,
                replace: "return [$1, Vencord.Plugins.plugins.Timezones.getProfileTimezonesComponent(e)]"
            }
        }
    ],

    getProfileTimezonesComponent: (e: any) => {

        if (!Vencord.Settings.plugins.Timezones.showTimezonesInProfile) {
            return (<></>);
        }

        const user = e.user as User;

        const [timezone, setTimezone] = React.useState<Timezone | null>(null);

        React.useEffect(() => {
            getUserTimezone(user.id).then(timezone => setTimezone(timezone));
        }, [user.id]);


        return (
            <span style={{
                position: "absolute",
                top: "110px",
                right: "10px",
                zIndex: 5,
                background: "white",
                borderRadius: "5px",
                border: "4px solid white"
            }}>
                {timezone && getTimeString(timezone)}

            </span>

        );
    }
    ,
    getTimezonesComponent: (e: any) => {
        if (Vencord.Settings.plugins.showTimezonesInChat || e.user)
            return (<></>);

        const message = e.message as Message;

        const [timezone, setTimezone] = React.useState<Timezone | null>(null);

        React.useEffect(() => {
            getUserTimezone(e.message.author.id).then(timezone => setTimezone(timezone));
        }, [message.author.id]);


        return (
            <span className={classes(styles.timestampInline, styles.timestamp)}>
                {timezone && "• " + getTimeString(timezone, message.timestamp)}
            </span>);
    }
});

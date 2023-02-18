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
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { React, Text, UserStore } from "@webpack/common";
import { Message, User } from "discord-types/general";
const EditIcon = findByCodeLazy("M19.2929 9.8299L19.9409 9.18278C21.353 7.77064 21.353 5.47197 19.9409");
const classNames = findByPropsLazy("customStatusSection");

import { getTimeString, getUserTimezone } from "./Utils";
const styles = findByPropsLazy("timestampInline");

export default definePlugin({
    name: "Timezones",
    description: "Shows the timezones of users",
    authors: [Devs.mantikafasi],
    options: {

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
                    description: "Timezone id to set (see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)",
                    type: ApplicationCommandOptionType.STRING,
                }


            ],
            execute(args, ctx) {
                const user = findOption(args, "user");
                const timezone = findOption(args, "timezone");
                Vencord.Settings.plugins.Timezones[`timezones.${user}`] = timezone;
                sendBotMessage(ctx.channel.id, { content: "Timezone set" });
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
                    sendBotMessage(ctx.channel.id, { content: "No timezone" });
                    return;
                }
                delete Vencord.Settings.plugins.Timezones[`timezones.${user}`];
                sendBotMessage(ctx.channel.id, { content: "Timezone deleted" });
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
                sendBotMessage(ctx.channel.id, { content: str });
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
            find: "().customStatusSection",
            replacement: {
                // Inserts the timezone component right below the custom status.
                match: /user:(\w),nickname:\w,.*?children.*?\(\)\.customStatusSection.*?\}\),/,
                replace: "$&$self.getProfileTimezonesComponent({user:$1}),"
            }
        }
    ],

    getProfileTimezonesComponent: (e: any) => {

        const user = e.user as User;

        const [timezone, setTimezone] = React.useState<string | null>(null);

        React.useEffect(() => {
            getUserTimezone(user.id).then(timezone => setTimezone(timezone));
        }, [user.id]);

        if (!Vencord.Settings.plugins.Timezones.showTimezonesInProfile) {
            return null;
        }

        // thank you arjix very cool
        return (
            <Text variant="text-sm/normal" className={classNames.customStatusSection} onClick={() => {
                return console.log("ahhh!");
                // TODO create a modal to set timezone and make text clickable h
            }} style={{
                alignItems: "center",
                // make it clickable
                cursor: "pointer",
            }}>
                {(timezone) ? getTimeString(timezone) : "Click to set timezone"}
                <span
                    style={{ cursor: "pointer", position: "absolute" }}
                >
                    <EditIcon color="var(--primary-330)" height="16" width="16" style={{ marginLeft: "0.25vw" }} />
                </span>
            </Text>
        );
    }
    ,
    getTimezonesComponent: (e: any) => {
        if (Vencord.Settings.plugins.showTimezonesInChat || e.user || e.message.author.id === UserStore.getCurrentUser().id)
            return null;

        const message = e.message as Message;

        const [timezone, setTimezone] = React.useState<string | null>(null);

        React.useEffect(() => {
            getUserTimezone(e.message.author.id).then(timezone => setTimezone(timezone));
        }, [message.author.id]);

        return (
            <span className={classes(styles.timestampInline, styles.timestamp)}>
                {timezone && "• " + getTimeString(timezone, message.timestamp.toDate())}
            </span>);
    }
});

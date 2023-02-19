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
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import { classes, useForceUpdater } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { React, Select, Text, Toasts, UserStore } from "@webpack/common";
import { Message, User } from "discord-types/general";



const EditIcon = findByCodeLazy("M19.2929 9.8299L19.9409 9.18278C21.353 7.77064 21.353 5.47197 19.9409");
const DeleteIcon = findByCodeLazy("M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z");
const classNames = findByPropsLazy("customStatusSection");

import { timezones } from "./all_timezones";
import { DATASTORE_KEY, getTimeString, getUserTimezone, TimezoneDB } from "./Utils";
const styles = findByPropsLazy("timestampInline");



export default definePlugin({
    name: "Timezones",
    description: "Shows the timezones of users",
    authors: [Devs.mantikafasi, Devs.Arjix],
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
                    required: true
                },
                {
                    name: "timezone",
                    description: "Timezone id to set (see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }


            ],
            execute(args, ctx) {
                const user: string | undefined = findOption(args, "user");
                const timezone = (findOption(args, "timezone", timezones[timezones.indexOf("Etc/UTC")])?.trim() as typeof timezones[number] | undefined);


                // Kinda hard to happen, but just to be safe...
                if (!user || !timezone) return sendBotMessage(ctx.channel.id, { content: "PLease provider both a user and a timezone." });


                if (timezone && !timezones.includes(timezone)) {
                    sendBotMessage(ctx.channel.id, { content: "Invalid timezone.\nPlease look at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones" });
                    return;
                }

                DataStore.update(DATASTORE_KEY, (oldValue: TimezoneDB | undefined) => {
                    oldValue = oldValue || {};

                    oldValue[user] = timezone;
                    return oldValue;
                }).then(() => {
                    sendBotMessage(ctx.channel.id, { content: "Timezone set!" });
                }).catch(err => {
                    console.error(err);
                    sendBotMessage(ctx.channel.id, { content: "Something went wrong, please try again later." });
                });
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
                    required: true
                },
            ],
            execute(args, ctx) {
                const user: string | undefined = findOption(args, "user");
                if (!user) return sendBotMessage(ctx.channel.id, { content: "Please provide a user." }) && undefined;

                DataStore.update(DATASTORE_KEY, (oldValue: TimezoneDB | undefined) => {
                    oldValue = oldValue || {};

                    if (!Object.prototype.hasOwnProperty.call(oldValue, user))
                        sendBotMessage(ctx.channel.id, { content: "No timezones were set for this user." });
                    else {
                        delete oldValue[user];
                        sendBotMessage(ctx.channel.id, { content: "Timezone removed!." });
                    }

                    return oldValue;
                }).catch(err => {
                    console.error(err);
                    sendBotMessage(ctx.channel.id, { content: "Something went wrong, please try again later." });
                });
            }
        },
        {
            name: "gettimezones",
            description: "Get all timezones",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute(args, ctx) {
                DataStore.get(DATASTORE_KEY).then((timezones: TimezoneDB | undefined) => {
                    if (!timezones || Object.keys(timezones).length === 0) {
                        sendBotMessage(ctx.channel.id, { content: "No timezones are set." });
                        return;
                    }

                    sendBotMessage(ctx.channel.id, {
                        content: "Timezones for " + Object.keys(timezones).length + " users:\n" + Object.keys(timezones).map(user => {
                            return `<@${user}> - ${timezones[user]}`;
                        }).join("\n")
                    });
                }).catch(err => {
                    console.error(err);
                    sendBotMessage(ctx.channel.id, { content: "Something went wrong, please try again later." });
                });
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

        const [timezone, setTimezone] = React.useState<string | undefined>();
        const [isInEditMode, setIsInEditMode] = React.useState(false);
        const forceUpdate = useForceUpdater();

        React.useEffect(() => {
            getUserTimezone(user.id).then(timezone => setTimezone(timezone));

            // Rerender every second to stay in sync.
            setInterval(forceUpdate, 1000);
        }, [user.id]);

        if (!Vencord.Settings.plugins.Timezones.showTimezonesInProfile) {
            return null;
        }

        return (
            <Text variant="text-sm/normal" className={classNames.customStatusSection}
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    ...(isInEditMode ? {
                        display: "flex",
                        flexDirection: "column",
                    } : {})
                }}
            >
                {!isInEditMode && <span style={timezone ? { cursor: "pointer", } : {}} onClick={() => {
                    if (timezone) {
                        Toasts.show({
                            type: Toasts.Type.MESSAGE,
                            message: timezone,
                            id: Toasts.genId()
                        });
                    }
                }}>{(timezone) ? getTimeString(timezone) : "No timezone set"}</span>}

                {isInEditMode && (
                    <span style={{ width: "90%" }}>
                        <Select
                            placeholder="Pick a timezone"
                            options={timezones.map(tz => ({ label: tz, value: tz }))}
                            isSelected={tz => tz === timezone}
                            select={value => setTimezone(value)}
                            serialize={String}
                        />
                    </span>
                )}


                <span style={
                    isInEditMode ? {
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-around",
                        width: "60%",
                        marginTop: "5%"
                    } : {
                        marginLeft: "5%"
                    }}
                >
                    <EditIcon
                        style={{ cursor: "pointer", padding: "2px", border: "2px solid grey", borderRadius: "50px" }}
                        onClick={() => {
                            if (isInEditMode) {
                                if (timezone) {
                                    DataStore.update(DATASTORE_KEY, (oldValue: TimezoneDB | undefined) => {
                                        oldValue = oldValue || {};
                                        oldValue[user.id] = timezone as typeof timezones[number];
                                        return oldValue;
                                    }).then(() => {
                                        Toasts.show({
                                            type: Toasts.Type.SUCCESS,
                                            message: "Timezone set!",
                                            id: Toasts.genId()
                                        });
                                        setIsInEditMode(false);
                                    }).catch(err => {
                                        console.error(err);
                                        Toasts.show({
                                            type: Toasts.Type.FAILURE,
                                            message: "Something went wrong, please try again later.",
                                            id: Toasts.genId()
                                        });
                                    });
                                } else {
                                    setIsInEditMode(false);
                                }
                            } else {
                                setIsInEditMode(true);
                            }
                        }}
                        color="var(--primary-330)"
                        height="16"
                        width="16"
                    />

                    {isInEditMode &&
                        <DeleteIcon
                            style={{ cursor: "pointer", padding: "2px", border: "2px solid grey", borderRadius: "50px" }}
                            onClick={() => {
                                DataStore.update(DATASTORE_KEY, (oldValue: TimezoneDB | undefined) => {
                                    oldValue = oldValue || {};
                                    delete oldValue[user.id];
                                    return oldValue;
                                }).then(async () => {
                                    Toasts.show({
                                        type: Toasts.Type.SUCCESS,
                                        message: "Timezone removed!",
                                        id: Toasts.genId()
                                    });
                                    setIsInEditMode(false);
                                    setTimezone(await getUserTimezone(user.id));
                                }).catch(err => {
                                    console.error(err);
                                    Toasts.show({
                                        type: Toasts.Type.FAILURE,
                                        message: "Something went wrong, please try again later.",
                                        id: Toasts.genId()
                                    });
                                });
                            }}
                            color="var(--red-360)"
                            height="16"
                            width="16"
                        />
                    }
                </span>
            </Text>
        );
    }
    ,
    getTimezonesComponent: (e: any) => {
        if (Vencord.Settings.plugins.showTimezonesInChat || e.user || e.message.author.id === UserStore.getCurrentUser().id)
            return null;

        const message = e.message as Message;

        const [timezone, setTimezone] = React.useState<string | undefined>();

        React.useEffect(() => {
            getUserTimezone(message.author.id).then(timezone => setTimezone(timezone));
        }, [message.author.id]);

        return (
            <span className={classes(styles.timestampInline, styles.timestamp)}>
                {timezone && "• " + getTimeString(timezone, message.timestamp.toDate())}
            </span>);
    }
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React, SearchableSelect, Text, Toasts, UserStore } from "@webpack/common";
import { Message, User } from "discord-types/general";

import settings from "./settings";
const classNames = findByPropsLazy("customStatusSection");


import { CogWheel, DeleteIcon } from "@components/Icons";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { makeLazy } from "@utils/lazy";
import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";

import { API_URL, DATASTORE_KEY, getAllTimezones, getTimeString, getUserTimezone, TimezoneDB } from "./Utils";
const styles = findByPropsLazy("timestampInline");

const useTimezones = makeLazy(getAllTimezones);

export default definePlugin({
    settings,

    name: "Timezones",
    description: "Allows you to see and set the timezones of other users.",
    authors: [Devs.mantikafasi, Devs.Arjix],

    commands: [
        {
            name: "timezone",
            description: "Sends link to a website that shows timezone string, useful if you want to know your friends timezone",
            execute: () => {
                return { content: "https://gh.lewisakura.moe/timezone/" };
            }
        }
    ],

    settingsAboutComponent: () => {
        const href = `${API_URL}?client_mod=${encodeURIComponent(VENCORD_USER_AGENT)}`;
        return (
            <Text variant="text-md/normal">
                A plugin that displays the local time for specific users using their timezone. <br />
                Timezones can either be set manually or fetched automatically from the <a href={href}>TimezoneDB</a>
            </Text>
        );
    },

    patches: [
        {
            find: "copyMetaData:\"User Tag\"",
            replacement: {

                match: /return(\(0,.\.jsx\)\(.\.default,{className:.+?}\)]}\)}\))/,
                replace: "return [$1, $self.getProfileTimezonesComponent(arguments[0])]"
            },
        },
        {
            // thank you https://github.com/Syncxv/vc-timezones/blob/master/index.tsx for saving me from painful work
            find: ".badgesContainer,",
            replacement: {
                match: /id:\(0,\i\.getMessageTimestampId\)\(\i\),timestamp.{1,50}}\),/,
                replace: "$&,$self.getTimezonesComponent(arguments[0]),"
            }
        }
    ],

    getProfileTimezonesComponent: ({ user }: { user: User; }) => {
        const { preference, showTimezonesInProfile } = settings.use(["preference", "showTimezonesInProfile"]);

        const [timezone, setTimezone] = React.useState<string | undefined>();
        const [isInEditMode, setIsInEditMode] = React.useState(false);
        const [timezones, setTimezones] = React.useState<string[]>([]);

        const forceUpdate = useForceUpdater();

        React.useEffect(() => {
            useTimezones().then(setTimezones);
            getUserTimezone(user.id, preference).then(tz => setTimezone(tz));

            // Rerender every 10 seconds to stay in sync.
            const interval = setInterval(forceUpdate, 10 * 1000);

            return () => clearInterval(interval);
        }, [preference]);

        if (!showTimezonesInProfile)
            return null;

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
                {!isInEditMode &&
                    <span
                        style={{ fontSize: "1.2em", cursor: (timezone ? "pointer" : "") }}
                        onClick={() => {
                            if (timezone) {
                                Toasts.show({
                                    type: Toasts.Type.MESSAGE,
                                    message: timezone,
                                    id: Toasts.genId()
                                });
                            }
                        }}
                    >
                        {(timezone) ? getTimeString(timezone) : "No timezone set"}
                    </span>
                }

                {isInEditMode && (
                    <span style={{ width: "90%" }}>
                        <SearchableSelect
                            placeholder="Pick a timezone"
                            options={timezones.map(tz => ({ label: tz, value: tz }))}
                            value={timezone ? { label: timezone, value: timezone } : undefined}
                            onChange={value => { setTimezone(value); }}
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
                        marginLeft: "2%",
                        display: "flex"
                    }}
                >
                    <CogWheel
                        style={{ cursor: "pointer", padding: "2px", border: "2px solid grey", borderRadius: "50px" }}
                        onClick={() => {
                            if (!isInEditMode) {
                                setIsInEditMode(true);
                                return;
                            }

                            if (!timezone) {
                                setIsInEditMode(false);
                                return;
                            }

                            DataStore.update(DATASTORE_KEY, (oldValue: TimezoneDB | undefined) => {
                                oldValue = oldValue || {};
                                oldValue[user.id] = timezone;
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
                                    setTimezone(await getUserTimezone(user.id, preference));
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
            </Text >
        );
    },

    getTimezonesComponent: ({ message }: { message: Message; }) => {

        const { showTimezonesInChat, preference } = settings.use(["preference", "showTimezonesInChat"]);
        const [timezone, setTimezone] = React.useState<string | undefined>();

        React.useEffect(() => {
            if (!showTimezonesInChat) return;

            getUserTimezone(message.author.id, preference).then(tz => setTimezone(tz));
        }, [showTimezonesInChat, preference]);

        if (!showTimezonesInChat || message.author.id === UserStore.getCurrentUser()?.id)
            return null;

        return (
            <span className={classes(styles.timestampInline, styles.timestamp)}>
                {
                    timezone && "• " + getTimeString(timezone,
                        /* message.timestamp is actually Date but as discord-types is outdated I had to do this */
                        ((message.timestamp as unknown) as Date))
                }
            </span>);
    }
});

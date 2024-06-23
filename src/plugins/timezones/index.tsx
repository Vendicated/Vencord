/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { SearchableSelect, Text, Toasts, useEffect, UserStore, useState } from "@webpack/common";
import { Message, User } from "discord-types/general";

import settings from "./settings";
import { CogWheel, DeleteIcon } from "@components/Icons";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { makeLazy } from "@utils/lazy";
import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";

import { API_URL, DATASTORE_KEY, getAllTimezones, getTimeString, getUserTimezone, TimezoneDB } from "./utils";

const classNames = findByPropsLazy("customStatusSection");

const styles = findByPropsLazy("timestampInline");

const useTimezones = makeLazy(getAllTimezones);

export default definePlugin({
    settings,

    name: "Timezones",
    description: "Set and display the local times of you and other users via TimezoneDB",
    authors: [Devs.rushii, Devs.mantikafasi, Devs.Aria, Devs.Arjix],

    commands: [
        {
            name: "timezone",
            description: "Sends a link to a utility website that shows your current timezone identifier",
            execute: () => ({ content: "https://gh.lewisakura.moe/timezone/" }),
        },
    ],

    // TODO: show button to authorize tzdb and manage public tz
    settingsAboutComponent: () => {
        const href = `${API_URL}?client_mod=${encodeURIComponent(VENCORD_USER_AGENT)}`;
        return (
            <Text variant="text-md/normal">
                <br/>
                This plugin supports setting your own Timezone publicly for others to fetch and display via <a href={href}>TimezoneDB</a>.
                You can override other users' timezones locally if they haven't set their own.
            </Text>
        );
    },

    patches: [
        // {
        //     find: "copyMetaData:\"User Tag\"",
        //     replacement: {
        //         match: /return(\(0.+?}\)}\)]}\))}/,
        //         replace: "return [$1, $self.getProfileTimezonesComponent(arguments[0])] }",
        //     },
        // },
        {
            // TODO: fix this
            // thank you https://github.com/Syncxv/vc-timezones/blob/master/index.tsx for saving me from painful work
            find: ".badgesContainer,{",
            replacement: {
                match: /id:\(0,\i\.getMessageTimestampId\)\(\i\),timestamp.{1,50}}\),/,
                replace: "$&,$self.getTimezonesComponent(arguments[0]),",
            },
        },
    ],

    // TODO: make this not ugly (port vc-timezones plugin)
    getProfileTimezonesComponent: ({ user }: { user: User; }) => {
        const { preference, showInProfile } = settings.use(["preference", "showInProfile"]);

        const [timezone, setTimezone] = useState<string | undefined>();
        const [isInEditMode, setIsInEditMode] = useState(false);
        const [timezones, setTimezones] = useState<string[]>([]);

        const forceUpdate = useForceUpdater();

        useEffect(() => {
            useTimezones().then(setTimezones);
            getUserTimezone(user.id, preference).then(tz => setTimezone(tz));

            // Rerender every 10 seconds to stay in sync.
            const interval = setInterval(forceUpdate, 10 * 1000);

            return () => clearInterval(interval);
        }, [preference]);

        if (!showInProfile)
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
                      } : {}),
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
                                    id: Toasts.genId(),
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
                            onChange={value => {
                                setTimezone(value);
                            }}
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
                        marginTop: "5%",
                    } : {
                        marginLeft: "2%",
                        display: "flex",
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
                                    id: Toasts.genId(),
                                });

                                setIsInEditMode(false);
                            }).catch(err => {
                                console.error(err);
                                Toasts.show({
                                    type: Toasts.Type.FAILURE,
                                    message: "Something went wrong, please try again later.",
                                    id: Toasts.genId(),
                                });
                            });
                        }}
                        color="var(--primary-330)"
                        height="16"
                        width="16"
                    />

                    {isInEditMode &&
                        <DeleteIcon
                            style={{
                                cursor: "pointer",
                                padding: "2px",
                                border: "2px solid grey",
                                borderRadius: "50px",
                            }}
                            onClick={() => {
                                DataStore.update(DATASTORE_KEY, (oldValue: TimezoneDB | undefined) => {
                                    oldValue = oldValue || {};
                                    delete oldValue[user.id];
                                    return oldValue;
                                }).then(async () => {
                                    Toasts.show({
                                        type: Toasts.Type.SUCCESS,
                                        message: "Timezone removed!",
                                        id: Toasts.genId(),
                                    });
                                    setIsInEditMode(false);
                                    setTimezone(await getUserTimezone(user.id, preference));
                                }).catch(err => {
                                    console.error(err);
                                    Toasts.show({
                                        type: Toasts.Type.FAILURE,
                                        message: "Something went wrong, please try again later.",
                                        id: Toasts.genId(),
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
    },

    getTimezonesComponent: ({ message }: { message: Message; }) => {
        console.log(message);

        const { showInChat, preference } = settings.use(["preference", "showInChat"]);
        const [timeString, setTimeString] = useState<string>();

        if (!showInChat || message.author.id === UserStore.getCurrentUser()?.id)
            return null;

        useEffect(() => {
            if (!showInChat) return;

            (async function() {
                const timezone = await getUserTimezone(message.author.id, preference);
                const timestamp = (message.timestamp as unknown) as Date; // discord-types is outdated
                setTimeString(timezone && "• " + getTimeString(timezone, timestamp));
            })();
        }, [showInChat, preference]);

        return <>
            <span className={classes(styles.timestampInline, styles.timestamp)}>
                {timeString}
            </span>
        </>;
    },
});

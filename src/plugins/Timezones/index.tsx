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


import * as DataStore from "@api/DataStore";
import { Devs, VENCORD_USER_AGENT } from "@utils/constants";
import { classes, makeLazy, useForceUpdater } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { React, SearchableSelect, Text, Toasts, UserStore } from "@webpack/common";
import { Message, User } from "discord-types/general";
import settings from "./settings";


const EditIcon = findByCodeLazy("M19.2929 9.8299L19.9409 9.18278C21.353 7.77064 21.353 5.47197 19.9409");
const DeleteIcon = findByCodeLazy("M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z");
const classNames = findByPropsLazy("customStatusSection");

import { API_URL, DATASTORE_KEY, getAllTimezones, getTimeString, getUserTimezone, TimezoneDB } from "./Utils";
const styles = findByPropsLazy("timestampInline");

const useTimezones = makeLazy(getAllTimezones);

export default definePlugin({
    settings,

    name: "User Timezones",
    description: "Allows you to see and set the timezones of other users.",
    authors: [Devs.mantikafasi, Devs.Arjix],

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
            find: "showCommunicationDisabledStyles",
            replacement: {

                match: /(?<=return\s*\(0,\w{1,3}\.jsxs?\)\(.+!\w{1,3}&&)(\[{0,1}\(0,\w{1,3}.jsxs?\)\(.+?\{.+?\}\)*\]{0,1})/,
                replace: "[$1, $self.getTimezonesComponent(e)]"
            },
        },
        {
            find: "().customStatusSection",
            replacement: {
                match: /user:(\w),nickname:\w,.*?children.*?\(\)\.customStatusSection.*?\}\),/,
                replace: "$&$self.getProfileTimezonesComponent({user:$1}),"
            }
        }
    ],

    getProfileTimezonesComponent: ({ user }: { user: User; }) => {
        const { preference } = settings.use(["preference"]);

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

        if (!Vencord.Settings.plugins.Timezones.showTimezonesInProfile)
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
                    <EditIcon
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
                {timezone && "• " + getTimeString(timezone, message.timestamp.toDate())}
            </span>);
    }
});

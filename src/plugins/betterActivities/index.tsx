/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { PresenceStore, React, Tooltip, useStateFromStores } from "@webpack/common";
import { User } from "discord-types/general";

import ActivityTooltip from "./components/ActivityTooltip";
import { Caret } from "./components/Caret";
import { SpotifyIcon } from "./components/SpotifyIcon";
import { TwitchIcon } from "./components/TwitchIcon";
import settings from "./settings";
import { Activity, ActivityListIcon, ActivityViewProps, ApplicationIcon, IconCSSProperties } from "./types";
import {
    getApplicationIcons
} from "./utils";

const cl = classNameFactory("vc-bactivities-");

const ActivityView = findComponentByCodeLazy<ActivityViewProps>("onOpenGameProfile:");

// if discord one day decides to change their icon this needs to be updated
const DefaultActivityIcon = findComponentByCodeLazy("M6,7 L2,7 L2,6 L6,6 L6,7 Z M8,5 L2,5 L2,4 L8,4 L8,5 Z M8,3 L2,3 L2,2 L8,2 L8,3 Z M8.88888889,0 L1.11111111,0 C0.494444444,0 0,0.494444444 0,1.11111111 L0,8.88888889 C0,9.50253861 0.497461389,10 1.11111111,10 L8.88888889,10 C9.50253861,10 10,9.50253861 10,8.88888889 L10,1.11111111 C10,0.494444444 9.5,0 8.88888889,0 Z");

export default definePlugin({
    name: "BetterActivities",
    description: "Shows activity icons in the member list and allows showing all activities",
    authors: [Devs.D3SOX, Devs.Arjix, Devs.AutumnVN],
    tags: ["activity"],

    settings,

    patchActivityList: ({ activities, user }: { activities: Activity[], user: User; }): JSX.Element | null => {
        const icons: ActivityListIcon[] = [];

        const applicationIcons = getApplicationIcons(activities);
        if (applicationIcons.length) {
            const compareImageSource = (a: ApplicationIcon, b: ApplicationIcon) => {
                return a.image.src === b.image.src;
            };
            const uniqueIcons = applicationIcons.filter((element, index, array) => {
                return array.findIndex(el => compareImageSource(el, element)) === index;
            });
            for (const appIcon of uniqueIcons) {
                icons.push({
                    iconElement: <img {...appIcon.image} />,
                    tooltip: <ActivityTooltip
                        activity={appIcon.activity}
                        application={appIcon.application}
                        user={user}
                        cl={cl}
                    />
                });
            }
        }

        const addActivityIcon = (activityName: string, IconComponent: React.ComponentType) => {
            const activityIndex = activities.findIndex(({ name }) => name === activityName);
            if (activityIndex !== -1) {
                const activity = activities[activityIndex];
                const iconObject: ActivityListIcon = {
                    iconElement: <IconComponent />,
                    tooltip: <ActivityTooltip activity={activity} user={user} cl={cl} />
                };

                if (settings.store.specialFirst) {
                    icons.unshift(iconObject);
                } else {
                    icons.splice(activityIndex, 0, iconObject);
                }
            }
        };
        addActivityIcon("Twitch", TwitchIcon);
        addActivityIcon("Spotify", SpotifyIcon);

        if (icons.length) {
            const iconStyle: IconCSSProperties = {
                "--icon-size": `${settings.store.iconSize}px`,
            };

            return <ErrorBoundary noop>
                <div className={cl("row")}>
                    {icons.map(({ iconElement, tooltip }, i) => (
                        <div key={i} className={cl("icon")} style={iconStyle}>
                            {tooltip ? <Tooltip text={tooltip}>
                                {({ onMouseEnter, onMouseLeave }) => (
                                    <div
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}>
                                        {iconElement}
                                    </div>
                                )}
                            </Tooltip> : iconElement}
                        </div>
                    ))}
                </div>
            </ErrorBoundary>;
        } else {
            // Show default icon when there are no custom icons
            // We need to filter out custom statuses
            const shouldShow = activities.filter(a => a.type !== 4).length !== icons.length;
            if (shouldShow) {
                return <DefaultActivityIcon />;
            }
        }

        return null;
    },

    showAllActivitiesComponent({ activity, user, guild, channelId, onClose }: ActivityViewProps) {
        const [currentActivity, setCurrentActivity] = React.useState<Activity | null>(
            activity?.type !== 4 ? activity! : null
        );

        const activities = useStateFromStores<Activity[]>(
            [PresenceStore], () => PresenceStore.getActivities(user.id).filter((activity: Activity) => activity.type !== 4)
        ) ?? [];

        React.useEffect(() => {
            if (!activities.length) {
                setCurrentActivity(null);
                return;
            }

            if (!currentActivity || !activities.includes(currentActivity))
                setCurrentActivity(activities[0]);

        }, [activities]);

        if (!activities.length) return null;

        if (settings.store.allActivitiesStyle === "carousel") {
            return (
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <ActivityView
                        activity={currentActivity}
                        user={user}
                        guild={guild}
                        channelId={channelId}
                        onClose={onClose}/>
                    <div
                        className={cl("controls")}
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "space-between",
                        }}
                    >
                        <Tooltip text="Left" tooltipClassName={cl("controls-tooltip")}>{({
                            onMouseEnter,
                            onMouseLeave
                        }) => {
                            return <span
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                onClick={() => {
                                    const index = activities.indexOf(currentActivity!);
                                    if (index - 1 >= 0)
                                        setCurrentActivity(activities[index - 1]);
                                }}
                            >
                                <Caret
                                    disabled={activities.indexOf(currentActivity!) < 1}
                                    direction="left"/>
                            </span>;
                        }}</Tooltip>

                        <div className="carousell">
                            {activities.map((activity, index) => (
                                <div
                                    key={"dot--" + index}
                                    onClick={() => setCurrentActivity(activity)}
                                    className={`dot ${currentActivity === activity ? "selected" : ""}`}/>
                            ))}
                        </div>

                        <Tooltip text="Right" tooltipClassName={cl("controls-tooltip")}>{({
                            onMouseEnter,
                            onMouseLeave
                        }) => {
                            return <span
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                onClick={() => {
                                    const index = activities.indexOf(currentActivity!);
                                    if (index + 1 < activities.length)
                                        setCurrentActivity(activities[index + 1]);
                                }}
                            >
                                <Caret
                                    disabled={activities.indexOf(currentActivity!) >= activities.length - 1}
                                    direction="right"/>
                            </span>;
                        }}</Tooltip>
                    </div>
                </div>
            );
        } else {
            return (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                    }}
                >
                    {activities.map((activity, index) => (
                        <ActivityView
                            key={index}
                            activity={activity}
                            user={user}
                            guild={guild}
                            channelId={channelId}
                            onClose={onClose}
                        />
                    ))}
                </div>
            );
        }
    },

    patches: [
        {
            // Patch activity icons
            find: "default.getHangStatusActivity():null!",
            replacement: {
                match: /null!=(\i)&&\i.some\(\i=>\(0,\i.default\)\(\i,\i\)\)\?/,
                replace: "$self.patchActivityList(e),false?"
            },
            predicate: () => settings.store.memberList,
        },
        {
            // Show all activities in the profile panel
            find: "Profile Panel: user cannot be undefined",
            replacement: {
                match: /(?<=\(0,\i\.jsx\)\()\i\.\i(?=,{activity:.+?,user:\i,channelId:\i.id,)/,
                replace: "$self.showAllActivitiesComponent"
            },
            predicate: () => settings.store.profileSidebar,
        },
        {
            // Show all activities in the user popout
            find: "customStatusSection,",
            replacement: {
                match: /(?<=\(0,\i\.jsx\)\()\i\.\i(?=,{activity:\i,user:\i,guild:\i,channelId:\i,onClose:\i,)/,
                replace: "$self.showAllActivitiesComponent"
            },
            predicate: () => settings.store.userPopout
        }
    ],
});

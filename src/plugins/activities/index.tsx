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

import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode, findStoreLazy } from "@webpack";
import { React, Tooltip, useStateFromStores } from "@webpack/common";
import { Guild, User } from "discord-types/general";

import { ActivityIcon, Caret, ControllerIcon, HeadsetIcon, PlaystationIcon, RichActivityIcon, XboxIcon } from "./icons";
import { Activity, ActivityProps, ActivityType } from "./types";

const PresenceStore = findStoreLazy("PresenceStore");
const regex = /const \w=function\((\w)\)\{var .*?\.activities.*?.applicationStream.*?children:\[.*?null!=.*?\w\.some\(.{3}\)\?(.*?):null/;
const ActivityView = LazyComponent(() => findByCode("onOpenGameProfile:"));

import "./style.css";

import { definePluginSettings } from "@api/settings";

const settings = definePluginSettings({
    moreActivityIcons: {
        type: OptionType.BOOLEAN,
        restartNeeded: true,
        default: true,
        description: "Enable/Disable the extra activity icons (e.g. the controller icon for games).",
    },
    showAllActivities: {
        type: OptionType.BOOLEAN,
        restartNeeded: true,
        default: true,
        description: "Enable/Disable the activities carousel in the user profile."
    },
});

export default definePlugin({
    name: "Activities",
    description: "TODO!()",
    authors: [Devs.Arjix],
    settings,

    patches: [
        {
            find: "().textRuler,",
            replacement: {
                match: regex,
                replace: (m, activities, icon) => m.replace(icon, `$self.ActivitiesComponent({...${activities}})`)
            },
            predicate: () => settings.store.moreActivityIcons
        },
        {
            find: "().customStatusSection",
            replacement: {
                match: /\(0,\w\.jsx\)\((\w\.Z),{activity:\w,user:\w,guild:\w,channelId:\w,onClose:\w}\)/,
                replace: (m, comp) => m.replace(comp, "$self.ShowAllActivitiesComponent")
            },
            predicate: () => settings.store.showAllActivities
        }
    ],

    /*
        Stolen from <https://betterdiscord.app/plugin/ShowAllActivities>
    */
    ShowAllActivitiesComponent({ activity, user, guild, channelId, onClose }:
        { activity: Activity; user: User, guild: Guild, channelId: string, onClose: () => void; }
    ) {
        const [currentActivity, setCurrentActivity] = React.useState<Activity | null>(
            activity?.type !== ActivityType.CustomStatus
                ? activity!
                : null
        );

        const activities = useStateFromStores<Activity[]>([PresenceStore],
            () => PresenceStore.getActivities(user.id)
                .filter((a: Activity) => a.type !== ActivityType.CustomStatus)
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

        return (
            <div style={{ display: "flex", flexDirection: "column" }}>
                <ActivityView
                    activity={currentActivity}
                    user={user}
                    guild={guild}
                    channelId={channelId}
                    onClose={onClose}
                />
                <div
                    className="vc-activities-controls"
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                    }}
                >
                    <Tooltip text="Left" tooltipClassName="vc-activities-controls-tooltip">{({ onMouseEnter, onMouseLeave }) => {
                        return <span
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            onClick={() => {
                                const idx = activities.indexOf(currentActivity!);
                                if (idx - 1 >= 0)
                                    setCurrentActivity(activities[idx - 1]);
                            }}
                        >
                            <Caret
                                disabled={activities.indexOf(currentActivity!) < 1}
                                direction="left"
                            />
                        </span>;
                    }}</Tooltip>

                    <div className="carousell">
                        {activities.map((act, i) => (
                            <div
                                key={"dot--" + i}
                                onClick={() => setCurrentActivity(act)}
                                className={`dot ${currentActivity === act ? "selected" : ""}`}
                            />
                        ))}
                    </div>

                    <Tooltip text="Right" tooltipClassName="vc-activities-controls-tooltip">{({ onMouseEnter, onMouseLeave }) => {
                        return <span
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            onClick={() => {
                                const idx = activities.indexOf(currentActivity!);
                                if (idx + 1 < activities.length)
                                    setCurrentActivity(activities[idx + 1]);
                            }}
                        >
                            <Caret
                                disabled={activities.indexOf(currentActivity!) >= activities.length - 1}
                                direction="right"
                            />
                        </span>;
                    }}</Tooltip>
                </div>
            </div>
        );
    },

    ActivitiesComponent(props: ActivityProps) {
        if (!props.activities.length) return null;
        let showRichActivityTooltip = true;

        const icons = props.activities.map(activity => {
            switch (activity.type) {
                case ActivityType.Competing:
                case ActivityType.Playing: {
                    showRichActivityTooltip = false;

                    const isXbox = activity.platform === "xbox";
                    const isPlaystation = /ps\d/.test(activity.platform ?? "");

                    let icon: React.ReactNode = <ControllerIcon width={14} height={14} />;

                    if (isXbox) icon = <XboxIcon width={14} height={14} />;
                    if (isPlaystation) icon = <PlaystationIcon width={14} height={14} />;

                    return (
                        <Tooltip text={`Playing “${activity.name}”`}>{
                            ({ onMouseEnter, onMouseLeave }) => {
                                return <span
                                    onMouseEnter={onMouseEnter}
                                    onMouseLeave={onMouseLeave}
                                >
                                    {icon}
                                </span>;
                            }
                        }</Tooltip>
                    );
                }

                case ActivityType.Listening: {
                    showRichActivityTooltip = false;
                    return <Tooltip text={`Listening to “${activity.details}” by “${activity.state?.replace(/;/g, ",")}”`}>
                        {({ onMouseEnter, onMouseLeave }) => {
                            return <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                                <HeadsetIcon width={14} height={14} />
                            </span>;
                        }}
                    </Tooltip>;
                }
            }
        }).filter(Boolean);

        const richDetails = props.activities.find(activity => (activity.assets || activity.details) && !activity.platform);
        const activityIcon = richDetails ?
            <RichActivityIcon width={16} height={16} />
            : <ActivityIcon width={16} height={16} />;

        icons.splice(0, 0, <Tooltip text={richDetails?.name} shouldShow={!!richDetails?.name?.trim() && showRichActivityTooltip}>
            {({ onMouseEnter, onMouseLeave }) => {
                return <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{activityIcon}</span>;
            }}
        </Tooltip>);

        return (
            <span style={{ display: "flex", alignItems: "center" }}>
                {icons}
            </span>
        );
    },
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode, findStoreLazy } from "@webpack";
import { React, Tooltip, useStateFromStores } from "@webpack/common";
import { Guild, User } from "discord-types/general";

import { ActivityIcon, Caret, ControllerIcon, HeadsetIcon, MobileIcon, PlaystationIcon, RichActivityIcon, XboxIcon } from "./icons";
import { Activity, ActivityProps, ActivityType } from "./types";

const PresenceStore = findStoreLazy("PresenceStore");
const ActivityView = LazyComponent(() => findByCode("onOpenGameProfile:"));

import "./style.css";

import { definePluginSettings } from "@api/Settings";

const settings = definePluginSettings({
    moreActivityIcons: {
        type: OptionType.BOOLEAN,
        restartNeeded: true,
        default: true,
        description: "e.g. the controller icon for games, headphone icon for spotify.",
    },
    showAllActivities: {
        type: OptionType.BOOLEAN,
        restartNeeded: true,
        default: true,
        description: "The activities carousel in the user profile."
    },
    ignoreBotsIcon: {
        type: OptionType.BOOLEAN,
        restartNeeded: true,
        default: true,
        description: "Ignore bots' activities icon."
    }
});

export default definePlugin({
    name: "Activities",
    description: "A combination of the ActivityIcons and ShowAllActivities BD plugins.",
    authors: [Devs.Arjix, Devs.AutumnVN],
    tags: ["ActivityIcons", "ShowAllActivities"],
    settings,

    patches: [
        {
            find: "().textRuler,",
            replacement: {
                match: /const \w=function\((\w)\)\{var .*?\.activities.*?.applicationStream.*?children:\[.*?null!=.*?(\w\.some\(.{3}\)\?.*?:null)/,
                replace: (m, activities, icon) => m.replace(icon, `$self.ActivitiesComponent(${activities})`)
            },
            predicate: () => settings.store.moreActivityIcons
        },
        {
            find: "().customStatusSection",
            replacement: {
                match: /\(0,\w\.jsx\)\((\w\.Z),{activity:\w,user:\w,guild:\w,channelId:\w,onClose:\w}\)/,
                replace: (m, component) => m.replace(component, "$self.ShowAllActivitiesComponent")
            },
            predicate: () => settings.store.showAllActivities
        }
    ],

    ShowAllActivitiesComponent({ activity, user, guild, channelId, onClose }:
        { activity: Activity; user: User, guild: Guild, channelId: string, onClose: () => void; }) {
        const [currentActivity, setCurrentActivity] = React.useState<Activity | null>(
            activity?.type !== ActivityType.CustomStatus ? activity! : null
        );

        const activities = useStateFromStores<Activity[]>(
            [PresenceStore], () => PresenceStore.getActivities(user.id).filter((activity: Activity) => activity.type !== ActivityType.CustomStatus)
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
                                const index = activities.indexOf(currentActivity!);
                                if (index - 1 >= 0)
                                    setCurrentActivity(activities[index - 1]);
                            }}
                        >
                            <Caret
                                disabled={activities.indexOf(currentActivity!) < 1}
                                direction="left"
                            />
                        </span>;
                    }}</Tooltip>

                    <div className="carousell">
                        {activities.map((activity, index) => (
                            <div
                                key={"dot--" + index}
                                onClick={() => setCurrentActivity(activity)}
                                className={`dot ${currentActivity === activity ? "selected" : ""}`}
                            />
                        ))}
                    </div>

                    <Tooltip text="Right" tooltipClassName="vc-activities-controls-tooltip">{({ onMouseEnter, onMouseLeave }) => {
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
                                direction="right"
                            />
                        </span>;
                    }}</Tooltip>
                </div>
            </div>
        );
    },

    ActivitiesComponent(props: ActivityProps) {
        const botActivityKeys = ["created_at", "id", "name", "type", "url"];
        const isBot = props.activities.length === 1 && Object.keys(props.activities[0]).every((value, i) => value === botActivityKeys[i]);
        if (!props.activities.length || (isBot && settings.store.ignoreBotsIcon)) return null;
        const gameActivities: Activity[] = [];

        const icons = props.activities.map(activity => {
            switch (activity.type) {
                case ActivityType.Competing:
                case ActivityType.Playing: {
                    if (!activity.platform) {
                        gameActivities.push(activity);
                        return;
                    }

                    const isXbox = activity.platform === "xbox";
                    const isPlaystation = /ps\d/.test(activity.platform ?? "");
                    const isSamsung = activity.platform === "samsung";

                    let icon: React.ReactNode = <ControllerIcon width={14} height={14} />;

                    if (isXbox) icon = <XboxIcon width={14} height={14} />;
                    if (isPlaystation) icon = <PlaystationIcon width={14} height={14} />;
                    if (isSamsung) icon = <MobileIcon width={14} height={14} />;

                    return (
                        <Tooltip text={activity.name}>{
                            ({ onMouseEnter, onMouseLeave }) => {
                                return <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{icon}</span>;
                            }
                        }</Tooltip>
                    );
                }

                case ActivityType.Listening: {
                    let tooltipText = "";
                    if (activity.details && activity.state) {
                        const artists = (activity.state.split(";") ?? []).map(a => a.trim());
                        let songTitle = activity.details;

                        for (const artist of artists) {
                            songTitle = songTitle.replace(`(feat. ${artist})`, "");
                        }

                        tooltipText = `${songTitle.trim()} - ${artists.join(", ")}`;
                    } else {
                        tooltipText = activity.name ?? "";
                    }

                    return <Tooltip text={tooltipText} shouldShow={!!tooltipText.trim()}>
                        {({ onMouseEnter, onMouseLeave }) => {
                            return <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                                <HeadsetIcon width={14} height={14} />
                            </span>;
                        }}
                    </Tooltip>;
                }
                default: return;
            }
        }).filter(Boolean);

        const richPresenceActivities = gameActivities.filter(activity => (activity.assets || activity.details));

        const gameIcons: React.ReactNode[] = [];
        for (const gameActivity of gameActivities) {
            const activityIcon = richPresenceActivities.includes(gameActivity) ?
                <RichActivityIcon width={16} height={16} />
                : <ActivityIcon width={16} height={16} />;

            gameActivity && gameIcons.push(<Tooltip text={gameActivity?.name} shouldShow={!!gameActivity?.name?.trim()}>
                {({ onMouseEnter, onMouseLeave }) => {
                    return <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{activityIcon}</span>;
                }}
            </Tooltip>);
        }

        return (
            <span style={{ height: "16px" }}>
                {gameIcons.concat(icons)}
            </span>
        );
    },
});

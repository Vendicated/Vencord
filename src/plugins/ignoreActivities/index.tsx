/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { getSettingStoreLazy } from "@api/SettingsStore";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Tooltip } from "webpack/common";

const enum ActivitiesTypes {
    Game,
    Embedded
}

interface IgnoredActivity {
    id: string;
    name: string;
    type: ActivitiesTypes;
}

const RunningGameStore = findStoreLazy("RunningGameStore");
const ShowCurrentGame = getSettingStoreLazy<boolean>("status", "showCurrentGame");

function ToggleIcon(activity: IgnoredActivity, tooltipText: string, path: string, fill: string) {
    const forceUpdate = useForceUpdater();

    return (
        <Tooltip text={tooltipText}>
            {tooltipProps => (
                <button
                    {...tooltipProps}
                    onClick={e => handleActivityToggle(e, activity, forceUpdate)}
                    style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 -960 960 960"
                    >
                        <path fill={fill} d={path} />
                    </svg>
                </button>
            )}
        </Tooltip>
    );
}

const ToggleIconOn = (activity: IgnoredActivity, fill: string) => ToggleIcon(activity, "Disable Activity", "M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z", fill);
const ToggleIconOff = (activity: IgnoredActivity, fill: string) => ToggleIcon(activity, "Enable Activity", "m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z", fill);

function ToggleActivityComponent(activity: IgnoredActivity, isPlaying = false) {
    if (getIgnoredActivities().some(act => act.id === activity.id)) return ToggleIconOff(activity, "var(--status-danger)");
    return ToggleIconOn(activity, isPlaying ? "var(--green-300)" : "var(--primary-400)");
}

function handleActivityToggle(e: React.MouseEvent<HTMLButtonElement, MouseEvent>, activity: IgnoredActivity, forceUpdateButton: () => void) {
    e.stopPropagation();

    const ignoredActivityIndex = getIgnoredActivities().findIndex(act => act.id === activity.id);
    if (ignoredActivityIndex === -1) settings.store.ignoredActivities = getIgnoredActivities().concat(activity);
    else settings.store.ignoredActivities = getIgnoredActivities().filter((_, index) => index !== ignoredActivityIndex);

    // Trigger activities recalculation
    ShowCurrentGame?.updateSetting(old => old);
    forceUpdateButton();
}

const settings = definePluginSettings({}).withPrivateSettings<{
    ignoredActivities: IgnoredActivity[];
}>();

function getIgnoredActivities() {
    return settings.store.ignoredActivities ??= [];
}

export default definePlugin({
    name: "IgnoreActivities",
    authors: [Devs.Nuckyz],
    description: "Ignore activities from showing up on your status ONLY. You can configure which ones are ignored from the Registered Games and Activities tabs.",

    dependencies: ["SettingsStoreAPI"],
    settings,

    patches: [
        {
            find: '.displayName="LocalActivityStore"',
            replacement: [
                {
                    match: /LISTENING.+?\)\);(?<=(\i)\.push.+?)/,
                    replace: (m, activities) => `${m}${activities}=${activities}.filter($self.isActivityNotIgnored);`
                }
            ]
        },
        {
            find: ".Messages.SETTINGS_GAMES_TOGGLE_OVERLAY",
            replacement: {
                match: /\(\)\.removeGame.+?null(?<=(\i)\?\i=\i\.\i\.Messages\.SETTINGS_GAMES_NOW_PLAYING_STATE.+?=(\i)\.overlay.+?)/,
                replace: (m, nowPlaying, props) => `${m},$self.renderToggleGameActivityButton(${props},${nowPlaying})`
            }
        },
        {
            find: ".Messages.EMBEDDED_ACTIVITIES_DEVELOPER_SHELF_SUBTITLE",
            replacement: [
                {
                    match: /(?<=\(\)\.activityTitleText.+?children:(\i)\.name.*?}\),)/,
                    replace: (_, props) => `$self.renderToggleActivityButton(${props}),`
                },
                {
                    match: /(?<=\(\)\.activityCardDetails.+?children:(\i\.application)\.name.*?}\),)/,
                    replace: (_, props) => `$self.renderToggleActivityButton(${props}),`
                }
            ]
        }
    ],

    async start() {
        const oldIgnoredActivitiesData = await DataStore.get<Map<IgnoredActivity["id"], IgnoredActivity>>("IgnoreActivities_ignoredActivities");

        if (oldIgnoredActivitiesData != null) {
            settings.store.ignoredActivities = Array.from(oldIgnoredActivitiesData.values())
                .map(activity => ({ ...activity, name: "Unknown Name" }));

            DataStore.del("IgnoreActivities_ignoredActivities");
        }

        if (getIgnoredActivities().length !== 0) {
            const gamesSeen = RunningGameStore.getGamesSeen() as { id?: string; exePath: string; }[];

            for (const [index, ignoredActivity] of getIgnoredActivities().entries()) {
                if (ignoredActivity.type !== ActivitiesTypes.Game) continue;

                if (!gamesSeen.some(game => game.id === ignoredActivity.id || game.exePath === ignoredActivity.id)) {
                    getIgnoredActivities().splice(index, 1);
                }
            }
        }
    },

    isActivityNotIgnored(props: { type: number; application_id?: string; name?: string; }) {
        if (props.type === 0 || props.type === 3) {
            if (props.application_id != null) return !getIgnoredActivities().some(activity => activity.id === props.application_id);
            else {
                const exePath = RunningGameStore.getRunningGames().find(game => game.name === props.name)?.exePath;
                if (exePath) return !getIgnoredActivities().some(activity => activity.id === exePath);
            }
        }
        return true;
    },

    renderToggleGameActivityButton(props: { id?: string; name: string, exePath: string; }, nowPlaying: boolean) {
        return (
            <ErrorBoundary noop>
                <div style={{ marginLeft: 12, zIndex: 0 }}>
                    {ToggleActivityComponent({ id: props.id ?? props.exePath, name: props.name, type: ActivitiesTypes.Game }, nowPlaying)}
                </div>
            </ErrorBoundary>
        );
    },

    renderToggleActivityButton(props: { id: string; name: string; }) {
        return (
            <ErrorBoundary noop>
                {ToggleActivityComponent({ id: props.id, name: props.name, type: ActivitiesTypes.Embedded })}
            </ErrorBoundary>
        );
    }
});

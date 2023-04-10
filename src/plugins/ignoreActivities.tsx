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
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Tooltip } from "webpack/common";

enum ActivitiesTypes {
    Game,
    Embedded
}

interface IgnoredActivity {
    id: string;
    type: ActivitiesTypes;
}

const RegisteredGamesClasses = findByPropsLazy("overlayToggleIconOff", "overlayToggleIconOn");
const TryItOutClasses = findByPropsLazy("tryItOutBadge", "tryItOutBadgeIcon");
const BaseShapeRoundClasses = findByPropsLazy("baseShapeRound", "baseShapeRoundLeft", "baseShapeRoundRight");
const RunningGameStore = findStoreLazy("RunningGameStore");

function ToggleIconOff() {
    return (
        <svg
            className={RegisteredGamesClasses.overlayToggleIconOff}
            height="24"
            width="24"
            viewBox="0 0 32 26"
            aria-hidden={true}
            role="img"
        >
            <g
                fill="none"
                fillRule="evenodd"
            >
                <path
                    className={RegisteredGamesClasses.fill}
                    fill="currentColor"
                    d="M 16 8 C 7.664063 8 1.25 15.34375 1.25 15.34375 L 0.65625 16 L 1.25 16.65625 C 1.25 16.65625 7.097656 23.324219 14.875 23.9375 C 15.246094 23.984375 15.617188 24 16 24 C 16.382813 24 16.753906 23.984375 17.125 23.9375 C 24.902344 23.324219 30.75 16.65625 30.75 16.65625 L 31.34375 16 L 30.75 15.34375 C 30.75 15.34375 24.335938 8 16 8 Z M 16 10 C 18.203125 10 20.234375 10.601563 22 11.40625 C 22.636719 12.460938 23 13.675781 23 15 C 23 18.613281 20.289063 21.582031 16.78125 21.96875 C 16.761719 21.972656 16.738281 21.964844 16.71875 21.96875 C 16.480469 21.980469 16.242188 22 16 22 C 15.734375 22 15.476563 21.984375 15.21875 21.96875 C 11.710938 21.582031 9 18.613281 9 15 C 9 13.695313 9.351563 12.480469 9.96875 11.4375 L 9.9375 11.4375 C 11.71875 10.617188 13.773438 10 16 10 Z M 16 12 C 14.34375 12 13 13.34375 13 15 C 13 16.65625 14.34375 18 16 18 C 17.65625 18 19 16.65625 19 15 C 19 13.34375 17.65625 12 16 12 Z M 7.25 12.9375 C 7.09375 13.609375 7 14.285156 7 15 C 7 16.753906 7.5 18.394531 8.375 19.78125 C 5.855469 18.324219 4.105469 16.585938 3.53125 16 C 4.011719 15.507813 5.351563 14.203125 7.25 12.9375 Z M 24.75 12.9375 C 26.648438 14.203125 27.988281 15.507813 28.46875 16 C 27.894531 16.585938 26.144531 18.324219 23.625 19.78125 C 24.5 18.394531 25 16.753906 25 15 C 25 14.285156 24.90625 13.601563 24.75 12.9375 Z"
                />
                <rect
                    className={RegisteredGamesClasses.fill}
                    x="3"
                    y="26"
                    width="26"
                    height="2"
                    transform="rotate(-45 2 20)"
                />
            </g>
        </svg>
    );
}

function ToggleIconOn({ forceWhite }: { forceWhite?: boolean; }) {
    return (
        <svg
            className={RegisteredGamesClasses.overlayToggleIconOn}
            height="24"
            width="24"
            viewBox="0 0 32 26"
        >
            <path
                className={forceWhite ? "" : RegisteredGamesClasses.fill}
                fill={forceWhite ? "var(--white-500)" : ""}
                d="M 16 8 C 7.664063 8 1.25 15.34375 1.25 15.34375 L 0.65625 16 L 1.25 16.65625 C 1.25 16.65625 7.097656 23.324219 14.875 23.9375 C 15.246094 23.984375 15.617188 24 16 24 C 16.382813 24 16.753906 23.984375 17.125 23.9375 C 24.902344 23.324219 30.75 16.65625 30.75 16.65625 L 31.34375 16 L 30.75 15.34375 C 30.75 15.34375 24.335938 8 16 8 Z M 16 10 C 18.203125 10 20.234375 10.601563 22 11.40625 C 22.636719 12.460938 23 13.675781 23 15 C 23 18.613281 20.289063 21.582031 16.78125 21.96875 C 16.761719 21.972656 16.738281 21.964844 16.71875 21.96875 C 16.480469 21.980469 16.242188 22 16 22 C 15.734375 22 15.476563 21.984375 15.21875 21.96875 C 11.710938 21.582031 9 18.613281 9 15 C 9 13.695313 9.351563 12.480469 9.96875 11.4375 L 9.9375 11.4375 C 11.71875 10.617188 13.773438 10 16 10 Z M 16 12 C 14.34375 12 13 13.34375 13 15 C 13 16.65625 14.34375 18 16 18 C 17.65625 18 19 16.65625 19 15 C 19 13.34375 17.65625 12 16 12 Z M 7.25 12.9375 C 7.09375 13.609375 7 14.285156 7 15 C 7 16.753906 7.5 18.394531 8.375 19.78125 C 5.855469 18.324219 4.105469 16.585938 3.53125 16 C 4.011719 15.507813 5.351563 14.203125 7.25 12.9375 Z M 24.75 12.9375 C 26.648438 14.203125 27.988281 15.507813 28.46875 16 C 27.894531 16.585938 26.144531 18.324219 23.625 19.78125 C 24.5 18.394531 25 16.753906 25 15 C 25 14.285156 24.90625 13.601563 24.75 12.9375 Z"
            />
        </svg>
    );
}

function ToggleActivityComponent({ activity, forceWhite, forceLeftMargin }: { activity: IgnoredActivity; forceWhite?: boolean; forceLeftMargin?: boolean; }) {
    const forceUpdate = useForceUpdater();

    return (
        <Tooltip text="Toggle activity">
            {({ onMouseLeave, onMouseEnter }) => (
                <div
                    onMouseLeave={onMouseLeave}
                    onMouseEnter={onMouseEnter}
                    className={RegisteredGamesClasses.overlayToggleIcon}
                    role="button"
                    aria-label="Toggle activity"
                    tabIndex={0}
                    style={forceLeftMargin ? { marginLeft: "2px" } : undefined}
                    onClick={e => handleActivityToggle(e, activity, forceUpdate)}
                >
                    {
                        ignoredActivitiesCache.has(activity.id)
                            ? <ToggleIconOff />
                            : <ToggleIconOn forceWhite={forceWhite} />
                    }
                </div>
            )}
        </Tooltip>
    );
}

function ToggleActivityComponentWithBackground({ activity }: { activity: IgnoredActivity; }) {
    return (
        <div
            className={`${TryItOutClasses.tryItOutBadge} ${BaseShapeRoundClasses.baseShapeRound}`}
            style={{ padding: "0px 2px" }}
        >
            <ToggleActivityComponent activity={activity} forceWhite={true} />
        </div>
    );
}

function handleActivityToggle(e: React.MouseEvent<HTMLDivElement, MouseEvent>, activity: IgnoredActivity, forceUpdateComponent: () => void) {
    e.stopPropagation();
    if (ignoredActivitiesCache.has(activity.id)) ignoredActivitiesCache.delete(activity.id);
    else ignoredActivitiesCache.set(activity.id, activity);
    forceUpdateComponent();
    saveCacheToDatastore();
}

async function saveCacheToDatastore() {
    await DataStore.set("IgnoreActivities_ignoredActivities", ignoredActivitiesCache);
}

let ignoredActivitiesCache = new Map<IgnoredActivity["id"], IgnoredActivity>();

export default definePlugin({
    name: "IgnoreActivities",
    authors: [Devs.Nuckyz],
    description: "Ignore certain activities (like games and actual activities) from showing up on your status. You can configure which ones are ignored from the Registered Games and Activities tabs.",
    patches: [
        {
            find: ".Messages.SETTINGS_GAMES_TOGGLE_OVERLAY",
            replacement: {
                match: /!(\i)(\)return null;var \i=(\i)\.overlay.+?children:)(\[.{0,70}overlayStatusText.+?\])(?=}\)}\(\))/,
                replace: (_, platformCheck, restWithoutPlatformCheck, props, children) => "false"
                    + `${restWithoutPlatformCheck}`
                    + `(${platformCheck}?${children}:[])`
                    + `.concat(Vencord.Plugins.plugins.IgnoreActivities.renderToggleGameActivityButton(${props}))`
            }
        },
        {
            find: ".overlayBadge",
            replacement: {
                match: /(?<=\(\)\.badgeContainer.+?(\i)\.name}\):null)/,
                replace: (_, props) => `,$self.renderToggleActivityButton(${props})`
            }
        },
        {
            find: '.displayName="LocalActivityStore"',
            replacement: {
                match: /LISTENING.+?\)\);(?<=(\i)\.push.+?)/,
                replace: (m, activities) => `${m}${activities}=${activities}.filter($self.isActivityNotIgnored);`
            }
        }
    ],

    async start() {
        const ignoredActivitiesData = await DataStore.get<string[] | Map<IgnoredActivity["id"], IgnoredActivity>>("IgnoreActivities_ignoredActivities") ?? new Map<IgnoredActivity["id"], IgnoredActivity>();
        /** Migrate old data */
        if (Array.isArray(ignoredActivitiesData)) {
            for (const id of ignoredActivitiesData) {
                ignoredActivitiesCache.set(id, { id, type: ActivitiesTypes.Game });
            }

            await saveCacheToDatastore();
        } else ignoredActivitiesCache = ignoredActivitiesData;

        if (ignoredActivitiesCache.size !== 0) {
            const gamesSeen: { id?: string; exePath: string; }[] = RunningGameStore.getGamesSeen();

            for (const ignoredActivity of ignoredActivitiesCache.values()) {
                if (ignoredActivity.type !== ActivitiesTypes.Game) continue;

                if (!gamesSeen.some(game => game.id === ignoredActivity.id || game.exePath === ignoredActivity.id)) {
                    /** Custom added game which no longer exists */
                    ignoredActivitiesCache.delete(ignoredActivity.id);
                }
            }

            await saveCacheToDatastore();
        }
    },

    renderToggleGameActivityButton(props: { id?: string; exePath: string; }) {
        return (
            <ErrorBoundary noop>
                <ToggleActivityComponent activity={{ id: props.id ?? props.exePath, type: ActivitiesTypes.Game }} forceLeftMargin={true} />
            </ErrorBoundary>
        );
    },

    renderToggleActivityButton(props: { id: string; }) {
        return (
            <ErrorBoundary noop>
                <ToggleActivityComponentWithBackground activity={{ id: props.id, type: ActivitiesTypes.Embedded }} />
            </ErrorBoundary>
        );
    },

    isActivityNotIgnored(props: { type: number; application_id?: string; name?: string; }) {
        if (props.type === 0) {
            if (props.application_id !== undefined) return !ignoredActivitiesCache.has(props.application_id);
            else {
                const exePath = RunningGameStore.getRunningGames().find(game => game.name === props.name)?.exePath;
                if (exePath) return !ignoredActivitiesCache.has(exePath);
            }
        }
        return true;
    }
});

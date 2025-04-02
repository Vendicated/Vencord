/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { findComponentByCodeLazy } from "@webpack";
import { React, Tooltip } from "@webpack/common";
import { JSX } from "react";

import { ActivityTooltip } from "../components/ActivityTooltip";
import { SpotifyIcon } from "../components/SpotifyIcon";
import { TwitchIcon } from "../components/TwitchIcon";
import { settings } from "../settings";
import { ActivityListIcon, ActivityListProps, ApplicationIcon, IconCSSProperties } from "../types";
import { cl, getApplicationIcons } from "../utils";

// if discord one day decides to change their icon this needs to be updated
const DefaultActivityIcon = findComponentByCodeLazy("M6,7 L2,7 L2,6 L6,6 L6,7 Z M8,5 L2,5 L2,4 L8,4 L8,5 Z M8,3 L2,3 L2,2 L8,2 L8,3 Z M8.88888889,0 L1.11111111,0 C0.494444444,0 0,0.494444444 0,1.11111111 L0,8.88888889 C0,9.50253861 0.497461389,10 1.11111111,10 L8.88888889,10 C9.50253861,10 10,9.50253861 10,8.88888889 L10,1.11111111 C10,0.494444444 9.5,0 8.88888889,0 Z");

export function patchActivityList({ activities, user, hideTooltip }: ActivityListProps): JSX.Element | null {
    const icons: ActivityListIcon[] = [];

    if (user.bot || hideTooltip) return null;

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
                tooltip: <ActivityTooltip activity={appIcon.activity} application={appIcon.application} user={user} />
            });
        }
    }

    const addActivityIcon = (activityName: string, IconComponent: React.ComponentType) => {
        const activityIndex = activities.findIndex(({ name }) => name === activityName);
        if (activityIndex !== -1) {
            const activity = activities[activityIndex];
            const iconObject: ActivityListIcon = {
                iconElement: <IconComponent />,
                tooltip: <ActivityTooltip activity={activity} user={user} />
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
}

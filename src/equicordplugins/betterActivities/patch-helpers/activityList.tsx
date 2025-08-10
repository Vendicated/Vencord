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
import { TwitchIcon } from "../components/TwitchIcon";
import { settings } from "../settings";
import { ActivityListIcon, ActivityListProps, ApplicationIcon, IconCSSProperties } from "../types";
import { cl, getApplicationIcons } from "../utils";

// Discord no longer shows an icon here by default but we use the one from the popout now here
const DefaultActivityIcon = findComponentByCodeLazy("M5 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3H5Zm6.81 7c-.54 0-1 .26-1.23.61A1 1 0 0 1 8.92 8.5 3.49 3.49 0 0 1 11.82 7c1.81 0 3.43 1.38 3.43 3.25 0 1.45-.98 2.61-2.27 3.06a1 1 0 0 1-1.96.37l-.19-1a1 1 0 0 1 .98-1.18c.87 0 1.44-.63 1.44-1.25S12.68 9 11.81 9ZM13 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm7-10.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM7 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM5.5 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z");

export function patchActivityList({ activities, user, hideTooltip }: ActivityListProps): JSX.Element | null {
    const icons: ActivityListIcon[] = [];

    if (user.bot || settings.store.hideTooltip && hideTooltip) return null;

    const applicationIcons = getApplicationIcons(activities);
    if (applicationIcons.length) {
        const compareImageSource = (a: ApplicationIcon, b: ApplicationIcon) => {
            return a.image?.src === b.image?.src;
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
            return <DefaultActivityIcon size="xs" />;
        }
    }

    return null;
}

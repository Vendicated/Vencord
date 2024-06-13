/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { findComponentByCodeLazy } from "@webpack";
import { moment, React, useMemo } from "@webpack/common";
import { User } from "discord-types/general";

import { Activity, Application } from "../types";
import {
    formatElapsedTime,
    getActivityImage,
    getApplicationIcons,
    getValidStartTimeStamp,
    getValidTimestamps
} from "../utils";

const TimeBar = findComponentByCodeLazy<{
    start: number;
    end: number;
    themed: boolean;
    className: string;
}>("isSingleLine");

interface ActivityTooltipProps {
    activity: Activity;
    application?: Application;
    user: User;
    cl: ReturnType<typeof classNameFactory>;
}

export default function ActivityTooltip({ activity, application, user, cl }: Readonly<ActivityTooltipProps>) {
    const image = useMemo(() => {
        const activityImage = getActivityImage(activity, application);
        if (activityImage) {
            return activityImage;
        }
        const icon = getApplicationIcons([activity], true)[0];
        return icon?.image.src;
    }, [activity]);
    const timestamps = useMemo(() => getValidTimestamps(activity), [activity]);
    let startTime = useMemo(() => getValidStartTimeStamp(activity), [activity]);

    startTime = Number(String(startTime).slice(0, -3));

    if (Number.isNaN(startTime)) {
        startTime = 9999999999;
    }

    const hasDetails = activity.details ?? activity.state;
    return (
        <ErrorBoundary>
            <div className={cl("activity")}>
                {image && <img className={cl("activity-image")} src={image} alt="Activity logo" />}
                <div className={cl("activity-title")}>{activity.name}</div>
                {hasDetails && <div className={cl("activity-divider")} />}
                <div className={cl("activity-details")}>
                    <div>{activity.details}</div>
                    <div>{activity.state}</div>
                    {!timestamps && startTime &&
                        <div className={cl("activity-time-bar")}>
                            {formatElapsedTime(moment(startTime), moment())}
                        </div>
                    }
                </div>
                {timestamps && (
                    <TimeBar start={timestamps.start}
                        end={timestamps.end}
                        themed={false}
                        className={cl("activity-time-bar")}
                    />
                )}
            </div>
        </ErrorBoundary>
    );
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Activity } from "@vencord/discord-types";
import { PresenceStore, React, useEffect, useMemo, UserStore, useState, useStateFromStores } from "@webpack/common";
import { JSX } from "react";

import { CarouselControls } from "../components/CarouselControls";
import { settings } from "../settings";
import { AllActivitiesProps } from "../types";
import { ActivityView, getActivityApplication } from "../utils";

export function showAllActivitiesComponent({ activity, user, ...props }: Readonly<AllActivitiesProps>): JSX.Element | null {
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser) return null;

    const [currentActivity, setCurrentActivity] = useState<Activity | null>(
        activity?.type !== 4 ? activity! : null
    );

    const activities = useStateFromStores(
        [PresenceStore],
        () => PresenceStore.getActivities(user.id).filter((activity: Activity) => activity.type !== 4)
    );

    useEffect(() => {
        if (!activities.length) {
            setCurrentActivity(null);
            return;
        }

        if (!currentActivity || !activities.includes(currentActivity))
            setCurrentActivity(activities[0]);
    }, [activities]);

    // we use these for other activities, it would be better to somehow get the corresponding activity props
    const generalProps = useMemo(() => Object.keys(props).reduce((acc, key) => {
        // exclude activity specific props to prevent copying them to all activities (e.g. buttons)
        if (key !== "renderActions" && key !== "application") acc[key] = props[key];
        return acc;
    }, {}), [props]);

    if (!activities.length) return null;

    if (settings.store.allActivitiesStyle === "carousel") {
        return (
            <ErrorBoundary noop>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    {activity && currentActivity?.id === activity.id ? (
                        <ActivityView
                            activity={currentActivity}
                            user={user}
                            currentUser={currentUser}
                            {...props}
                        />
                    ) : (
                        <ActivityView
                            activity={currentActivity}
                            user={user}
                            // fetch optional application
                            application={getActivityApplication(currentActivity!)}
                            currentUser={currentUser}
                            {...generalProps}
                        />
                    )}
                    {activities.length > 1 && currentActivity && (
                        <CarouselControls
                            activities={activities}
                            currentActivity={currentActivity}
                            onActivityChange={setCurrentActivity}
                        />
                    )}
                </div>
            </ErrorBoundary>
        );
    } else {
        return (
            <ErrorBoundary noop>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                    }}
                >
                    {activities.map((activity, index) =>
                        index === 0 ? (
                            <ActivityView
                                key={index}
                                activity={activity}
                                user={user}
                                currentUser={currentUser}
                                {...props}
                            />) : (
                            <ActivityView
                                key={index}
                                activity={activity}
                                user={user}
                                application={getActivityApplication(activity)}
                                currentUser={currentUser}
                                {...generalProps}
                            />
                        ))}
                </div>
            </ErrorBoundary>
        );
    }
}

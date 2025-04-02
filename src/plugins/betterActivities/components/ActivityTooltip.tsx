/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import { Activity, Application } from "../types";
import { ActivityView, cl } from "../utils";

interface ActivityTooltipProps {
    activity: Activity;
    application?: Application;
    user: User;
}

export function ActivityTooltip({ activity, application, user }: Readonly<ActivityTooltipProps>) {
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser) return null;
    return (
        <ErrorBoundary>
            <div className={cl("activity-tooltip")}>
                <ActivityView
                    activity={activity}
                    user={user}
                    application={application}
                    currentUser={currentUser}
                />
            </div>
        </ErrorBoundary>
    );
}

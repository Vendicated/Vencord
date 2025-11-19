/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { ActivityTooltipProps } from "@equicordplugins/betterActivities/types";
import { ActivityView, cl } from "@equicordplugins/betterActivities/utils";
import { UserStore } from "@webpack/common";

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

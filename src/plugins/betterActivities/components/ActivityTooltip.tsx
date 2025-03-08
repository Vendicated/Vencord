/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { User } from "discord-types/general";

import { ActivityView } from "../index";
import { Activity, Application } from "../types";

interface ActivityTooltipProps {
    activity: Activity;
    application?: Application;
    user: User;
    cl: ReturnType<typeof classNameFactory>;
}

export default function ActivityTooltip({ activity, application, user, cl }: Readonly<ActivityTooltipProps>) {
    return (
        <ErrorBoundary>
            <div className={cl("activity-tooltip")}>
                <ActivityView
                    activity={activity}
                    user={user}
                    application={application}
                    type="BiteSizePopout"
                />
            </div>
        </ErrorBoundary>
    );
}

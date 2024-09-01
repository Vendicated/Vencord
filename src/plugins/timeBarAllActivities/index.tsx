/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";

interface Activity {
    timestamps?: ActivityTimestamps;
}

interface ActivityTimestamps {
    start?: string;
    end?: string;
}

const ActivityTimeBar = findComponentByCodeLazy<ActivityTimestamps>(".Millis.HALF_SECOND", ".bar", ".progress");

export const settings = definePluginSettings({
    hideActivityDetailText: {
        type: OptionType.BOOLEAN,
        description: "Hide the large title text next to the activity",
        default: true,
    },
    hideActivityTimerBadges: {
        type: OptionType.BOOLEAN,
        description: "Hide the timer badges next to the activity",
        default: true,
    }
});

export default definePlugin({
    name: "TimeBarAllActivities",
    description: "Adds the Spotify time bar to all activities if they have start and end timestamps",
    authors: [Devs.fawn, Devs.niko],
    settings,
    patches: [
        {
            find: ".Messages.USER_ACTIVITY_PLAYING",
            replacement: [
                // Insert Spotify time bar component
                {
                    match: /\(0,.{0,30}activity:(\i),className:\i\.badges\}\)/g,
                    replace: "$&,$self.getTimeBar($1)"
                },
                // Hide the large title on listening activities, to make them look more like Spotify (also visible from hovering over the large icon)
                {
                    match: /(\i).type===(\i\.\i)\.WATCHING/,
                    replace: "($self.settings.store.hideActivityDetailText&&$self.isActivityTimestamped($1)&&$1.type===$2.LISTENING)||$&"
                }
            ]
        },
        // Hide the "badge" timers that count the time since the activity starts
        {
            find: ".TvIcon).otherwise",
            replacement: {
                match: /null!==\(\i=null===\(\i=(\i)\.timestamps\).{0,50}created_at/,
                replace: "($self.settings.store.hideActivityTimerBadges&&$self.isActivityTimestamped($1))?null:$&"
            }
        }
    ],

    isActivityTimestamped(activity: Activity) {
        return activity.timestamps != null && activity.timestamps.start != null && activity.timestamps.end != null;
    },

    getTimeBar(activity: Activity) {
        if (this.isActivityTimestamped(activity)) {
            return <ActivityTimeBar start={activity.timestamps!.start} end={activity.timestamps!.end} />;
        }
    }
});

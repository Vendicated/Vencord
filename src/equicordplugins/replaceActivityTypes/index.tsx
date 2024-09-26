/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 your mom lol
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import { ReplaceSettings, ReplaceTutorial } from "./ReplaceSettings";
import { Activity, ActivityType, AppIdSetting } from "./types";

const APP_IDS_KEY = "ReplaceActivityType_appids";

export const makeEmptyAppId: () => AppIdSetting = () => ({
    appId: "",
    appName: "Unknown",
    streamUrl: "",
    swapNameAndDetails: false,
    activityType: ActivityType.PLAYING,
    enabled: true
});

let appIds = [makeEmptyAppId()];

const settings = definePluginSettings({
    replacedAppIds: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const update = useForceUpdater();
            return (
                <>
                    <ReplaceSettings
                        appIds={appIds}
                        update={update}
                        save={async () => DataStore.set(APP_IDS_KEY, appIds)}
                    />
                </>
            );
        }
    },
});

export default definePlugin({
    name: "ReplaceActivityTypes",
    description: "Replace the activity type (Playing) of any rich presence app (rats in my vencord?)",
    authors: [Devs.Nyako],
    patches: [
        // how has this patch not broken yet lol (i do not like fixing patches tho)
        {
            find: '"LocalActivityStore"',
            replacement: {
                match: /\i\((\i)\)\{.{0,50}activity.{0,10}=\i;/,
                replace: "$&$self.patchActivity($1.activity);",
            }
        }
    ],
    settings,
    settingsAboutComponent: () => <ReplaceTutorial />,

    async start() {
        appIds = await DataStore.get(APP_IDS_KEY) ?? [makeEmptyAppId()];
    },

    patchActivity(activity: Activity) {
        if (!activity) return;
        console.log(activity);
        appIds.forEach(app => {
            if (app.enabled && app.appId === activity.application_id) {
                activity.type = app.activityType;

                if (app.activityType === ActivityType.STREAMING && app.streamUrl) {
                    activity.url = app.streamUrl;
                }

                if (app.swapNameAndDetails) {
                    const media = activity.details;
                    activity.details = activity.name;
                    activity.name = media;
                }

            }
        });
    },
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { ModalAPI } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { PresenceStore, UserStore } from "@webpack/common";
import { SelectOption } from "@webpack/types";

interface Activity {
    name: string;
    application_id?: string;
    type: number;
}

const settings = definePluginSettings({
    richPresenceTagging: {
        type: OptionType.SELECT,
        description: "When should clips be tagged with the current Rich Presence?",
        options: [
            { label: "Always", value: "always" },
            { label: "Only when beginning or end of activity name matches", value: "whenMatched", default: true },
            { label: "Never", value: "never" },
        ]
    },
    clipsLink: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            return (
                <>
                    <Link
                        href={findStoreLazy("ExperimentStore").getUserExperimentBucket("2024-04_game_settings_merge") === 1 ? "discord://-/settings/games/clips" : "discord://-/settings/clips"}
                        onClick={() => {
                            ModalAPI.closeAllModals();
                        }}
                    >
                        Change FPS and duration options in Clips settings!
                    </Link >
                </>
            );
        }
    },
});

export default definePlugin({
    name: "ClipsEnhancements",
    description: "Add more Clip FPS and duration options, plus RPC tagging!",
    authors: [Devs.niko],

    settings,

    patches: [
        {
            find: "clips_recording_settings",
            replacement: [
                {
                    match: /\[\{.{0,10}\i.\i.FPS_15.{0,250}\}\]/,
                    replace: "$self.patchFramerates($&)"
                },
                {
                    match: /\[\{.{0,10}\i.\i.SECONDS_30.{0,250}\}\]/,
                    replace: "$self.patchTimeslots($&)"
                },
            ]
        },
        {
            find: "clipMethod:\"manual\"",
            replacement: {
                match: /(applicationName:)(.{0,50})(,applicationId:)(\i)/,
                replace: "$1$2$3$self.getApplicationId($2)??$4"
            }
        }
    ],

    patchTimeslots(timeslots: SelectOption[]) {
        const newTimeslots = [...timeslots];
        const extraTimeslots = [3, 5, 7, 10];

        extraTimeslots.forEach(timeslot => newTimeslots.push({ value: timeslot * 60000, label: `${timeslot} Minutes` }));

        return newTimeslots;
    },

    patchFramerates(framerates: SelectOption[]) {
        const newFramerates = [...framerates];
        const extraFramerates = [45, 90, 120, 144, 165, 240];

        // Lower framerates than 15FPS have adverse affects on compression, 3 minute clips at 10FPS skyrocket the filesize to 200mb!!
        extraFramerates.forEach(framerate => newFramerates.push({ value: framerate, label: `${framerate}FPS` }));

        return newFramerates.toSorted();
    },

    getApplicationId(activityName: string) {
        if (settings.store.richPresenceTagging === "never") {
            return null;
        }

        const activities: Activity[] = PresenceStore.getActivities(UserStore.getCurrentUser().id);
        const validActivities = activities.filter(activity => activity.type === 0 && activity.application_id !== null);

        const splitName = activityName.split(" ");

        // Try to match activity by it's start and end
        const matchedActivities = validActivities.filter(activity => activity.name.endsWith(splitName.at(-1)!) || activity.name.startsWith(splitName.at(0)!));

        return (matchedActivities ?? (settings.store.richPresenceTagging === "whenMatched" ? null : validActivities))[0]?.application_id;
    }
});

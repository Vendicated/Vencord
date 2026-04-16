/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Devs, EquicordDevs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Activity } from "@vencord/discord-types";
import { PresenceStore, SettingsRouter, UserStore } from "@webpack/common";

const extraTimeslots = [3, 4, 5, 6, 7, 10, 15, 20, 25, 30];
const extraFramerates = [45, 90, 120, 144, 165, 240];

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
    enableScreenshotKeybind: {
        type: OptionType.BOOLEAN,
        description: "Enable the screenshot keybind feature",
        default: true,
        restartNeeded: true
    },
    enableVoiceOnlyClips: {
        type: OptionType.BOOLEAN,
        description: "Enable voice-only clips (audio without video)",
        default: true,
        restartNeeded: true
    },
    enableAdvancedSignals: {
        type: OptionType.BOOLEAN,
        description: "Enable advanced clip signals (auto-clip triggers)",
        default: true,
        restartNeeded: true
    },
    ignorePlatformRestriction: {
        type: OptionType.BOOLEAN,
        description: "Allow Platform Restricted Clipping (may cause save errors)",
        default: true,
        restartNeeded: true
    },
    clipsLink: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            return (
                <>
                    <Button
                        onClick={() => {
                            SettingsRouter.openUserSettings("clips_panel");
                        }}
                    >
                        Change FPS and duration options in Clips settings!
                    </Button >
                </>
            );
        }
    },
});

migratePluginSettings("ClipsEnhancements", "TimelessClips");
export default definePlugin({
    name: "ClipsEnhancements",
    description: "Add more Clip FPS and duration options, custom clip length, RPC tagging and more",
    tags: ["Activity", "Media", "Utility"],
    authors: [Devs.niko, Devs.Joona, EquicordDevs.keircn],
    settings,
    patches: [
        {
            find: "#{intl::CLIPS_UNKNOWN_SOURCE}",
            replacement: {
                match: /(applicationName:)(.{0,50})(,applicationId:)(\i)/,
                replace: "$1$2$3$self.getApplicationId($2)??$4"
            }
        },
        {
            find: ".CLIPS_FRAME_RATE,{",
            replacement: {
                match: /\[\{.{0,25}\i.\i.FPS_15.{0,500}\}\]/,
                replace: "$self.patchFramerates($&)"
            }
        },
        {
            find: ".CLIPS_LENGTH,{",
            replacement: {
                match: /\[\{.{0,25}\i.\i.SECONDS_30.{0,500}\}\]/,
                replace: "$self.patchTimeslots($&)"
            }
        },
        // enables clips
        {
            find: "2026-03-clips-experiment",
            replacement: {
                match: /defaultConfig:\{enableClips:!\d,ignorePlatformRestriction:!\d,showClipsHeaderEntrypoint:!\d,enableScreenshotKeybind:!\d,enableVoiceOnlyClips:!\d,enableAdvancedSignals:!\d\}/,
                replace: "defaultConfig:{enableClips:!0,ignorePlatformRestriction:$self.settings.store.ignorePlatformRestriction,showClipsHeaderEntrypoint:!0,enableScreenshotKeybind:$self.settings.store.enableScreenshotKeybind,enableVoiceOnlyClips:$self.settings.store.enableVoiceOnlyClips,enableAdvancedSignals:$self.settings.store.enableAdvancedSignals}"
            }
        }
    ],

    patchTimeslots(timeslots: { id: string; value: number; label: string; }[]) {
        const newTimeslots = [...timeslots];

        extraTimeslots.forEach(timeslot => newTimeslots.push({
            id: `${timeslot}min`,
            value: timeslot * 60000,
            label: getIntlMessage("CLIPS_LENGTH_MINUTES", {
                count: timeslot
            })
        }));

        return newTimeslots.sort((a, b) => a.value - b.value);
    },

    patchFramerates(framerates: { id: string; value: number; label: string; }[]) {
        const newFramerates = [...framerates];

        // Lower framerates than 15FPS have adverse affects on compression, 3 minute clips at 10FPS skyrocket the filesize to 200mb!!
        extraFramerates.forEach(framerate => newFramerates.push({
            id: `${framerate}fps`,
            value: framerate,
            label: getIntlMessage("SCREENSHARE_FPS_ABBREVIATED", {
                fps: framerate
            })
        }));

        return newFramerates.sort((a, b) => a.value - b.value);
    },

    getApplicationId(activityName: string) {
        if (settings.store.richPresenceTagging === "never") return null;

        const activities: Activity[] = PresenceStore.getActivities(UserStore.getCurrentUser().id);
        const validActivities = activities.filter(activity => activity.type === 0 && activity.application_id !== null);
        const splitName = activityName.split(" ");

        // Try to match activity by it's start and end
        const matchedActivities = validActivities.filter(activity => activity.name.endsWith(splitName.at(-1)!) || activity.name.startsWith(splitName.at(0)!));

        if (matchedActivities.length > 0) {
            return matchedActivities[0].application_id;
        }

        if (settings.store.richPresenceTagging !== "whenMatched") {
            return validActivities[0]?.application_id ?? null;
        }

        return null;
    },
});

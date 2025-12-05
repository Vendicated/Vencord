/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { Button, UserStore, SelectedChannelStore } from "@webpack/common";

import { buildSoundMap, getSoundEntries, settings } from "./settings";
import { openSoundSettingsModal } from "./SoundSettingsModal";
import { Devs } from "@utils/constants";

function getCustomSoundUrl(message: any) {
    if (!message || !message.author) return null;

    const currentUser = UserStore?.getCurrentUser?.();
    if (currentUser && message.author.id === currentUser.id) return null;

    const currentChannelId = SelectedChannelStore?.getChannelId?.();
    const messageChannelId = message.channel_id;

    if (currentChannelId === messageChannelId) return null;

    const soundEntries = getSoundEntries();
    const { userSounds, displayNameSounds, guildSounds } = buildSoundMap(soundEntries);

    const authorId = message.author.id;
    const authorDisplayName = message.author.globalName;
    const guildId = message.guild_id;

    let customSoundUrl = "";
    let customVolume = 0.5;

    if (guildId) {
        if (guildId && guildSounds[guildId]) {
            customSoundUrl = guildSounds[guildId].soundUrl;
            customVolume = guildSounds[guildId].volume;
        }
        else if (guildId && guildSounds["*"]) {
            customSoundUrl = guildSounds["*"].soundUrl;
            customVolume = guildSounds["*"].volume;
        }
    }
    else {
        if (userSounds[authorId]) {
            customSoundUrl = userSounds[authorId].soundUrl;
            customVolume = userSounds[authorId].volume;
        }
        else if (authorDisplayName && displayNameSounds[authorDisplayName]) {
            customSoundUrl = displayNameSounds[authorDisplayName].soundUrl;
            customVolume = displayNameSounds[authorDisplayName].volume;
        }
        else if (userSounds["*"]) {
            customSoundUrl = userSounds["*"].soundUrl;
            customVolume = userSounds["*"].volume;
        }
    }


    return customSoundUrl ? { url: customSoundUrl, volume: customVolume } : null;
}

export default definePlugin({
    name: "BetterNotifications",
    description: "Customize notification sounds by user or server",
    authors: [Devs.pvntr],
    settings,

    settingsAboutComponent: () => (
        <ErrorBoundary>
            <div style={{ marginBottom: "16px" }}>
                <Button onClick={openSoundSettingsModal}>
                    Configure Notification Sounds
                </Button>
            </div>
        </ErrorBoundary>
    ),

    patches: [
        {
            find: ".getDesktopType()===",
            replacement: {
                match: /sound:(\i)\?(\i):void 0,volume:([^,]+),onClick/,
                replace: "sound:$self.handleSoundLogic($1, arguments[0]?.message)?undefined:($1?$2:void 0),volume:$3,onClick"
            }
        }
    ],

    handleSoundLogic(shouldPlayOriginal: boolean, message: any) { // return true to play custom sound, false to play original
        console.log("[BetterNotifications] handleSoundLogic called with:", { shouldPlayOriginal, message });
        if (shouldPlayOriginal) {
            const customSound = getCustomSoundUrl(message);
            if (customSound) {
                try {
                    const audio = new Audio(customSound.url);
                    audio.volume = customSound.volume;
                    audio.play().catch(err => {
                        console.error("[BetterNotifications] Playback error:", err);
                    });
                    return true;
                } catch (err) {
                    console.error("[BetterNotifications] Error playing sound:", err);
                }
            }
        }
        return false;
    }
});
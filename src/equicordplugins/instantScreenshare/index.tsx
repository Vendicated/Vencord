/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUserSettingLazy } from "@api/UserSettings";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { VoiceState } from "@vencord/discord-types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { ChannelStore, MediaEngineStore, PermissionsBits, PermissionStore, SelectedChannelStore, showToast, Toasts, UserStore, VoiceActions, WindowStore } from "@webpack/common";

import { getCurrentMedia, settings } from "./utils";

let hasStreamed;
const startStream = findByCodeLazy('type:"STREAM_START"');
const StreamPreviewSettings = getUserSettingLazy("voiceAndVideo", "disableStreamPreviews")!;
const ApplicationStreamingSettingsStore = findStoreLazy("ApplicationStreamingSettingsStore");

async function autoStartStream(instant = true) {
    if (!instant && !WindowStore.isFocused() && settings.store.focusDiscord) return;
    const selected = SelectedChannelStore.getVoiceChannelId();
    if (!selected) return;

    const channel = ChannelStore.getChannel(selected);
    if (!channel) return;

    const isGuildChannel = !channel.isDM() && !channel.isGroupDM();

    if (channel.type === 13 || isGuildChannel && !PermissionStore.can(PermissionsBits.STREAM, channel)) return;

    if (settings.store.autoDeafen && !MediaEngineStore.isSelfDeaf() && instant) {
        VoiceActions.toggleSelfDeaf();
    } else if (settings.store.autoMute && !MediaEngineStore.isSelfMute() && instant) {
        VoiceActions.toggleSelfMute();
    }

    const streamMedia = await getCurrentMedia();
    const preview = StreamPreviewSettings.getSetting();
    const { soundshareEnabled } = ApplicationStreamingSettingsStore.getState();
    let sourceId = streamMedia.id;
    if (streamMedia.type === "video_device") sourceId = `camera:${streamMedia.id}`;

    startStream(channel.guild_id ?? null, selected, {
        "pid": null,
        "sourceId": sourceId,
        "sourceName": streamMedia.name,
        "audioSourceId": streamMedia.name,
        "sound": soundshareEnabled,
        "previewDisabled": preview
    });
}

export default definePlugin({
    name: "InstantScreenshare",
    description: "Instantly screenshare when joining a voice channel with support for desktop sources, windows, and video input devices (cameras, capture cards)",
    authors: [Devs.HAHALOSAH, Devs.thororen, EquicordDevs.mart],
    dependencies: ["EquicordToolbox"],
    tags: ["ScreenshareKeybind"],
    autoStartStream,
    settings,

    settingsAboutComponent: () => (
        <>
            <HeadingSecondary>For Linux</HeadingSecondary>
            <Paragraph>
                For Wayland it only pops up the screenshare select
                <br />
                For X11 it may or may not work :shrug:
            </Paragraph>
            <br />
            <HeadingSecondary>Video Devices</HeadingSecondary>
            <Paragraph>
                Supports cameras and capture cards (like Elgato HD60X) when enabled in settings
            </Paragraph>
            <br />
            <HeadingSecondary>Regarding Sound & Preview Settings</HeadingSecondary>
            <Paragraph>
                We use the settings set and used by discord to decide if stream preview and sound should be enabled or not
            </Paragraph>
        </>
    ),

    patches: [
        {
            find: "DISCONNECT_FROM_VOICE_CHANNEL]",
            predicate: () => settings.store.keybindScreenshare,
            replacement: {
                match: /\[\i\.\i\.DISCONNECT_FROM_VOICE_CHANNEL/,
                replace: '["INSTANT_SCREEN_SHARE"]:{onTrigger(){$self.autoStartStream(false)},keyEvents:{keyUp:!1,keyDown:!0}},$&'
            },
        },
        {
            find: "keybindActionTypes()",
            predicate: () => settings.store.keybindScreenshare,
            replacement: {
                match: /=\[(\{value:\i\.\i\.UNASSIGNED)/,
                replace: '=[{value:"INSTANT_SCREEN_SHARE",label:"Instant Screenshare"},$1'
            }
        }
    ],

    flux: {
        async VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            if (!settings.store.toolboxManagement || !settings.store.instantScreenshare) return;
            const myId = UserStore.getCurrentUser().id;
            for (const state of voiceStates) {
                const { userId, channelId } = state;
                if (userId !== myId) continue;

                if (channelId && !hasStreamed) {
                    hasStreamed = true;
                    await autoStartStream();
                }

                if (!channelId) {
                    hasStreamed = false;
                }

                break;
            }
        }
    },

    toolboxActions: {
        "Instant Screenshare"() {
            settings.store.toolboxManagement = !settings.store.toolboxManagement;
            showToast(`Instant Screenshare ${settings.store.toolboxManagement ? "Enabled" : "Disabled"}`, Toasts.Type.SUCCESS);
        }
    }
});

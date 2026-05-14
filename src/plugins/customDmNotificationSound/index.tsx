/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { CloudUploadIcon, DeleteIcon } from "@components/Icons";
import { Margins } from "@utils/margins";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { chooseFile } from "@utils/web";
import { MessageJSON, User } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { Button, ChannelStore, Forms, Menu, showToast, Toasts, UserStore } from "@webpack/common";

const markedMessages = new Set<string>();
let currentAudio: HTMLAudioElement | undefined;

function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function playSound(src: string, volume: number) {
    currentAudio?.pause();

    const audio = new Audio(src);
    audio.volume = Math.min(1, Math.max(0, volume));
    currentAudio = audio;

    void audio.play().catch(error => {
        showToast(`Failed to play custom notification sound: ${error.message}`, Toasts.Type.FAILURE);
    });
}

function SoundPicker({ setValue }: { setValue(value: string): void; }) {
    const { soundData } = settings.store;

    return (
        <div className={Margins.top8}>
            <Forms.FormTitle>Custom Sound</Forms.FormTitle>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <Button
                    onClick={async () => {
                        const file = await chooseFile("audio/*");
                        if (!file) return;

                        const dataUrl = await readFileAsDataUrl(file);
                        setValue(dataUrl);
                        showToast(`Selected ${file.name}`, Toasts.Type.SUCCESS);
                    }}
                >
                    <CloudUploadIcon height={16} width={16} />
                    Select Sound
                </Button>
                <Button
                    disabled={!soundData}
                    onClick={() => playSound(soundData, settings.store.volume / 100)}
                >
                    Preview
                </Button>
                <Button
                    disabled={!soundData}
                    color={Button.Colors.RED}
                    onClick={() => {
                        setValue("");
                        currentAudio?.pause();
                    }}
                >
                    <DeleteIcon height={16} width={16} />
                    Clear
                </Button>
            </div>
            <Forms.FormText className={Margins.top8}>
                Pick any audio file Discord can play. The file is stored in Vencord settings as a data URL.
            </Forms.FormText>
        </div>
    );
}

const settings = definePluginSettings({
    userId: {
        type: OptionType.STRING,
        description: "User ID to use the custom DM notification sound for",
        default: "",
        placeholder: "Right click a user and choose Mark for Custom DM Sound",
        isValid(value: string) {
            if (!value || /^\d{17,20}$/.test(value)) return true;
            return "Must be a valid Discord user ID.";
        }
    },
    soundData: {
        type: OptionType.COMPONENT,
        component: SoundPicker,
        default: ""
    },
    volume: {
        type: OptionType.SLIDER,
        description: "Custom sound volume",
        markers: makeRange(0, 100, 10),
        default: 100,
        stickToMarkers: false
    }
});

interface UserContextProps {
    user?: User;
}

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;

    const isMarked = settings.store.userId === user.id;

    children.push(
        <Menu.MenuItem
            id="vc-custom-dm-notification-sound"
            label={isMarked ? "Unmark Custom DM Sound" : "Mark for Custom DM Sound"}
            action={() => {
                settings.store.userId = isMarked ? "" : user.id;
                showToast(
                    isMarked
                        ? `Removed custom DM sound marker from ${user.username}`
                        : `Marked ${user.username} for custom DM sounds`,
                    Toasts.Type.SUCCESS
                );
            }}
        />
    );
};

export default definePlugin({
    name: "CustomDMNotificationSound",
    description: "Replaces Discord's default DM notification sound for one marked user with a selected custom sound",
    tags: ["Notifications", "Customisation"],
    authors: [{ name: "chase", id: 0n }],
    settings,

    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "user-profile-overflow-menu": userContextPatch
    },

    patches: [
        {
            find: ".getDesktopType()===",
            replacement: {
                match: /sound:(\i\?\i:void 0),volume:(\i),onClick/,
                replace: "sound:$self.getSound($1,arguments[0]?.message,$2),volume:$2,onClick"
            }
        }
    ],

    getSound(defaultSound: unknown, message?: MessageJSON, volume = 1) {
        if (!this.shouldReplaceSound(message)) return defaultSound;

        playSound(settings.store.soundData, settings.store.volume / 100 * volume);
        return undefined;
    },

    shouldReplaceSound(message?: MessageJSON) {
        if (!message?.id || markedMessages.has(message.id)) return false;
        if (!settings.store.userId || !settings.store.soundData) return false;
        if (message.author?.id !== settings.store.userId) return false;

        const channel = ChannelStore.getChannel(message.channel_id);
        if (channel?.type !== ChannelType.DM) return false;

        if (markedMessages.size > 500) markedMessages.clear();
        markedMessages.add(message.id);
        return true;
    }
});

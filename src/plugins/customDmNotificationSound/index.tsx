/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { CloudUploadIcon, DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { chooseFile } from "@utils/web";
import { Channel, MessageJSON, User } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { Button, ChannelStore, Forms, Menu, showToast, Toasts, UserStore } from "@webpack/common";

const MAX_CUSTOM_SOUNDS = 10;
const MAX_SOUND_FILE_SIZE = 512 * 1024;

const markedMessages = new Set<string>();
let currentAudio: HTMLAudioElement | undefined;

interface CustomSound {
    soundData: string;
    fileName: string;
}

type CustomSounds = Record<string, CustomSound>;

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

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function cloneCustomSounds(customSounds: CustomSounds) {
    return Object.fromEntries(
        Object.entries(customSounds).map(([userId, sound]) => [
            userId,
            {
                soundData: sound.soundData,
                fileName: sound.fileName
            }
        ])
    ) as CustomSounds;
}

async function chooseSound() {
    const file = await chooseFile("audio/*");
    if (!file) return null;

    if (file.size > MAX_SOUND_FILE_SIZE) {
        showToast("Audio file is too large. Please choose a file under 512 KB.", Toasts.Type.FAILURE);
        return null;
    }

    return {
        soundData: await readFileAsDataUrl(file),
        fileName: file.name
    };
}

async function addOrChangeSound(user: User) {
    try {
        if (!settings.store.customSounds[user.id] && Object.keys(settings.store.customSounds).length >= MAX_CUSTOM_SOUNDS) {
            showToast(`You can only add up to ${MAX_CUSTOM_SOUNDS} custom DM sounds.`, Toasts.Type.FAILURE);
            return;
        }

        const sound = await chooseSound();
        if (!sound) return;

        settings.store.customSounds = {
            ...cloneCustomSounds(settings.store.customSounds),
            [user.id]: sound
        };

        showToast(`Selected ${sound.fileName} for ${user.username}`, Toasts.Type.SUCCESS);
    } catch (error) {
        showToast(`Failed to load audio file: ${getErrorMessage(error)}`, Toasts.Type.FAILURE);
    }
}

function removeSound(userId: string) {
    const customSounds = cloneCustomSounds(settings.store.customSounds);
    delete customSounds[userId];
    settings.store.customSounds = customSounds;
}

function CustomSoundsManager({ setValue }: { setValue(value: CustomSounds): void; }) {
    const { customSounds } = settings.use(["customSounds"]);
    const entries = Object.entries(customSounds);

    function updateSound(userId: string, sound: CustomSound) {
        setValue({
            ...cloneCustomSounds(customSounds),
            [userId]: sound
        });
    }

    function remove(userId: string) {
        const nextCustomSounds = cloneCustomSounds(customSounds);
        delete nextCustomSounds[userId];
        setValue(nextCustomSounds);
        currentAudio?.pause();
    }

    return (
        <div className={Margins.top8}>
            <Forms.FormTitle>Custom User Sounds</Forms.FormTitle>
            {entries.length === 0 ? (
                <Forms.FormText>Right click a user and choose Add Custom DM Sound to pick a sound for them.</Forms.FormText>
            ) : entries.map(([userId, sound]) => {
                const user = UserStore.getUser(userId);

                return (
                    <div
                        key={userId}
                        style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}
                    >
                        <Forms.FormText style={{ minWidth: 180, flex: "1 1 180px" }}>
                            {user?.username ?? userId} - {sound.fileName}
                        </Forms.FormText>
                        <Button
                            onClick={async () => {
                                try {
                                    const nextSound = await chooseSound();
                                    if (!nextSound) return;

                                    updateSound(userId, nextSound);
                                    showToast(`Selected ${nextSound.fileName}`, Toasts.Type.SUCCESS);
                                } catch (error) {
                                    showToast(`Failed to load audio file: ${getErrorMessage(error)}`, Toasts.Type.FAILURE);
                                }
                            }}
                        >
                            <CloudUploadIcon height={16} width={16} />
                            Change
                        </Button>
                        <Button onClick={() => playSound(sound.soundData, settings.store.volume / 100)}>
                            Preview
                        </Button>
                        <Button
                            color={Button.Colors.RED}
                            onClick={() => remove(userId)}
                        >
                            <DeleteIcon height={16} width={16} />
                            Remove
                        </Button>
                    </div>
                );
            })}
            <Forms.FormText className={Margins.top8}>
                Pick audio files Discord can play. Files are stored in Vencord settings as data URLs. Limit: {MAX_CUSTOM_SOUNDS} users, 512 KB per file.
            </Forms.FormText>
        </div>
    );
}

const settings = definePluginSettings({
    customSounds: {
        type: OptionType.COMPONENT,
        component: CustomSoundsManager,
        default: {} as CustomSounds
    },
    volume: {
        type: OptionType.SLIDER,
        description: "Custom sound volume",
        markers: makeRange(0, 100, 10),
        default: 100,
        stickToMarkers: false
    }
}).withPrivateSettings<{
    userId?: string;
    soundData?: string;
}>();

interface UserContextProps {
    user?: User;
}

interface GroupDmContextProps {
    channel?: Channel;
}

function buildUserSoundMenuItem(user: User) {
    const customSound = settings.store.customSounds[user.id];

    return (
        <Menu.MenuItem
            id={`vc-custom-dm-notification-sound-${user.id}`}
            label={customSound ? `${user.username}: Custom DM Sound` : `Add Custom DM Sound for ${user.username}`}
            action={customSound ? undefined : () => void addOrChangeSound(user)}
        >
            {customSound && (
                <>
                    <Menu.MenuItem
                        id={`vc-custom-dm-notification-sound-change-${user.id}`}
                        label="Change Sound"
                        action={() => void addOrChangeSound(user)}
                    />
                    <Menu.MenuItem
                        id={`vc-custom-dm-notification-sound-preview-${user.id}`}
                        label="Preview Sound"
                        action={() => playSound(customSound.soundData, settings.store.volume / 100)}
                    />
                    <Menu.MenuItem
                        id={`vc-custom-dm-notification-sound-remove-${user.id}`}
                        label="Remove Sound"
                        color="danger"
                        action={() => {
                            removeSound(user.id);
                            showToast(`Removed custom DM sound for ${user.username}`, Toasts.Type.SUCCESS);
                        }}
                    />
                </>
            )}
        </Menu.MenuItem>
    );
}

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;

    children.push(buildUserSoundMenuItem(user));
};

const groupDmContextPatch: NavContextMenuPatchCallback = (children, { channel }: GroupDmContextProps) => {
    if (!channel || channel.type !== ChannelType.GROUP_DM) return;

    const currentUserId = UserStore.getCurrentUser().id;
    const recipients = channel.recipients
        .filter(userId => userId !== currentUserId)
        .map(userId => UserStore.getUser(userId))
        .filter(Boolean);

    if (!recipients.length) return;

    const container = findGroupChildrenByChildId("leave-channel", children) ?? children;
    container.unshift(
        <Menu.MenuItem
            id="vc-custom-dm-notification-sound"
            label="Custom DM Sounds"
        >
            {recipients.map(user => buildUserSoundMenuItem(user))}
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "CustomDMNotificationSound",
    description: "Replaces Discord's default DM notification sound for marked users with selected custom sounds",
    tags: ["Notifications", "Customisation"],
    authors: [Devs.Xlite],
    settings,

    start() {
        if (!settings.store.userId || !settings.store.soundData || settings.store.customSounds[settings.store.userId]) return;

        settings.store.customSounds = {
            ...cloneCustomSounds(settings.store.customSounds),
            [settings.store.userId]: {
                soundData: settings.store.soundData,
                fileName: "Migrated custom sound"
            }
        };
        delete settings.store.userId;
        delete settings.store.soundData;
    },

    stop() {
        currentAudio?.pause();
        currentAudio = undefined;
        markedMessages.clear();
    },

    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "user-profile-overflow-menu": userContextPatch,
        "gdm-context": groupDmContextPatch
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
        const authorId = message?.author?.id;
        const customSound = authorId ? settings.store.customSounds[authorId] : null;
        if (!customSound?.soundData || !message?.id) return defaultSound;

        const channel = ChannelStore.getChannel(message.channel_id);
        if (channel?.type !== ChannelType.DM && channel?.type !== ChannelType.GROUP_DM) return defaultSound;

        if (!markedMessages.has(message.id)) {
            if (markedMessages.size > 500) markedMessages.clear();
            markedMessages.add(message.id);
            playSound(customSound.soundData, settings.store.volume / 100 * volume);
        }

        return undefined;
    }
});

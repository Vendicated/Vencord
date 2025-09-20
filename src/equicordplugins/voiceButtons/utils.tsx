/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { openPrivateChannel } from "@utils/discord";
import { User } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { Button, MediaEngineStore, Tooltip, UserStore, VoiceActions } from "@webpack/common";

import { settings } from ".";

const SoundboardStore = findStoreLazy("SoundboardStore");

export function UserChatButton({ user }: { user: User; }) {
    if (user.id === UserStore.getCurrentUser().id) return null;
    return (
        <div className="click-to-chat-container">
            <Tooltip text={`Open chat with ${user.globalName} / @${user.username}`}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <Button
                        size={Button.Sizes.MIN}
                        color={Button.Colors.TRANSPARENT}
                        look={Button.Looks.BLANK}
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            openPrivateChannel({ recipientIds: [user.id] } as any);
                        }}
                        disabled={user.id === UserStore.getCurrentUser().id}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        <svg
                            className="click-to-chat-button"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="var(--channels-default)"
                        >
                            <path d="M12 22a10 10 0 1 0-8.45-4.64c.13.19.11.44-.04.61l-2.06 2.37A1 1 0 0 0 2.2 22H12Z"></path>
                        </svg>
                    </Button>
                )}
            </Tooltip>
        </div>
    );
}

export function UserMuteButton({ user }: { user: User; }) {
    if (user.id === UserStore.getCurrentUser().id) return null;
    return (
        <div className="click-to-chat-container">
            <Tooltip text={`${MediaEngineStore.isLocalMute(user.id) ? "Unmute" : "Mute"} ${user.globalName} / @${user.username}`}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <Button
                        size={Button.Sizes.MIN}
                        color={Button.Colors.TRANSPARENT}
                        look={Button.Looks.BLANK}
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            VoiceActions.toggleLocalMute(user.id);
                        }}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        <svg
                            className="click-to-chat-button"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill={MediaEngineStore.isLocalMute(user.id) ? "red" : "var(--channels-default)"}
                        >
                            <path d="M10.78 17.22c-.25.25-.13.67.22.72V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.06A8 8 0 0 0 20 10a1 1 0 1 0-2 0 6 6 0 0 1-5.8 6 .52.52 0 0 0-.35.15l-1.07 1.07ZM15.4 4.6a.46.46 0 0 0 .1-.56 4 4 0 0 0-4.03-2c-.4.05-.47.57-.21.89A3.22 3.22 0 0 1 9.9 8l-1.16.43a.5.5 0 0 0-.3.3L8.01 9.9 8 9.94V10c0 .33.04.66.12.96.08.34.5.42.74.18L15.4 4.6ZM5.1 14.07c.17.26.53.3.75.08l.75-.75c.16-.16.19-.41.08-.62a5.99 5.99 0 0 1-.24-.51.62.62 0 0 0-.7-.35c-.23.05-.47.08-.7.08-.37 0-.7.34-.58.7.18.47.4.93.65 1.37Z"></path>
                            <path d="M9.2 3.86a1.21 1.21 0 0 1 0 2.28l-1.37.5a2 2 0 0 0-1.18 1.19l-.51 1.38a1.21 1.21 0 0 1-2.28 0l-.5-1.38a2 2 0 0 0-1.19-1.18L.79 6.14a1.21 1.21 0 0 1 0-2.28l1.38-.5a2 2 0 0 0 1.18-1.19L3.86.79a1.21 1.21 0 0 1 2.28 0l.5 1.38a2 2 0 0 0 1.19 1.18l1.38.51Z"></path>
                            <path
                                fillRule="evenodd"
                                d="M22.7 1.3a1 1 0 0 1 0 1.4l-20 20a1 1 0 0 1-1.4-1.4l20-20a1 1 0 0 1 1.4 0Z"
                                clipRule="evenodd"
                            ></path>
                        </svg>
                    </Button>
                )}
            </Tooltip>
        </div>
    );
}

function DeafenIcon({ user, ...props }) {
    const isDeafened =
        MediaEngineStore.isLocalMute(user.id) &&
        SoundboardStore.isLocalSoundboardMuted(user.id) &&
        MediaEngineStore.isLocalVideoDisabled(user.id);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={16}
            height={16}
            fill="none"
            viewBox="0 0 24 24"
            className={""}
            {...props}
        >
            <path
                fill={isDeafened ? "red" : "var(--channels-default)"}
                fillRule="evenodd"
                d="M21.76.83a5.02 5.02 0 0 1 .78 7.7 5 5 0 0 1-7.07 0 5.02 5.02 0 0 1 0-7.07 5 5 0 0 1 6.29-.63Zm-4.88 2.05a3 3 0 0 1 3.41-.59l-4 4a3 3 0 0 1 .59-3.41Zm4.83.83-4 4a3 3 0 0 0 4-4Z"
                clipRule="evenodd"
                className={""}
            />
            <path
                fill={isDeafened ? "red" : "var(--channels-default)"}
                d="M12.38 1c.38.02.58.45.4.78-.15.3-.3.62-.4.95A.4.4 0 0 1 12 3a9 9 0 0 0-8.95 10h1.87a5 5 0 0 1 4.1 2.13l1.37 1.97a3.1 3.1 0 0 1-.17 3.78 2.85 2.85 0 0 1-3.55.74 11 11 0 0 1 5.71-20.61ZM22.22 11.22c.34-.18.76.02.77.4L23 12a11 11 0 0 1-5.67 9.62c-1.27.71-2.73.23-3.55-.74a3.1 3.1 0 0 1-.17-3.78l1.38-1.97a5 5 0 0 1 4.1-2.13h1.86c.03-.33.05-.66.05-1a.4.4 0 0 1 .27-.38c.33-.1.65-.25.95-.4Z"
                className={""}
            />
            {isDeafened && (
                <line
                    x1="22"
                    y1="2"
                    x2="2"
                    y2="22"
                    stroke="var(--status-danger)"
                    strokeWidth="2"
                />
            )}
        </svg>
    );
}

export function UserDeafenButton({ user }: { user: User; }) {
    if (user.id === UserStore.getCurrentUser().id) return null;
    const isDeafened =
        MediaEngineStore.isLocalMute(user.id) &&
        SoundboardStore.isLocalSoundboardMuted(user.id) &&
        MediaEngineStore.isLocalVideoDisabled(user.id);
    return (
        <div className="click-to-deafen-container">
            <Tooltip text={`${isDeafened ? "Undeafen" : "Deafen"} ${user.globalName} / @${user.username}`}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <Button
                        size={Button.Sizes.MIN}
                        color={Button.Colors.TRANSPARENT}
                        look={Button.Looks.BLANK}
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            VoiceActions.toggleLocalMute(user.id);
                            if (settings.store.muteSoundboard) {
                                VoiceActions.toggleLocalSoundboardMute(user.id);
                            }
                            if (settings.store.disableVideo) {
                                VoiceActions.setDisableLocalVideo(
                                    user.id,
                                    MediaEngineStore.isLocalVideoDisabled(user.id) ? "ENABLED" : "DISABLED",
                                    "default"
                                );
                            }
                        }}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        <DeafenIcon user={user} width={16} height={16} />
                    </Button>
                )}
            </Tooltip>
        </div>
    );
}

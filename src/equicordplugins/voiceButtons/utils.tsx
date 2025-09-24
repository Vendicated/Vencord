/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Icon, User } from "@vencord/discord-types";
import { findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Button, ChannelStore, MediaEngineStore, NavigationRouter, Tooltip, UserStore, VoiceActions } from "@webpack/common";
import { JSX } from "react";

import { settings } from "./settings";

const SoundboardStore = findStoreLazy("SoundboardStore");
const DeafenIconSelf = findComponentByCodeLazy("M22.7 2.7a1", "1.4l20-20ZM17") as Icon;
const DeafenIconOther = findComponentByCodeLazy("M21.76.83a5.02", "M12.38") as Icon;
const ChatIcon = findComponentByCodeLazy(".css,d:\"M12 22a10") as Icon;
const MuteIconSelf = findComponentByCodeLazy("d:\"m2.7 22.7 20-20a1", "1.4ZM10.8") as Icon;
const MuteIconOther = findComponentByCodeLazy("M21.76.83a5.02", "M12 2c.33 0") as Icon;

function VoiceUserButton({ user, tooltip, icon, onClick }: { user: User; tooltip: string; icon: JSX.Element; onClick: () => void; }) {
    const isCurrent = (user.id === UserStore.getCurrentUser().id);
    if (isCurrent && settings.store.showButtonsSelf === "hide") return null;
    const disabled = isCurrent && settings.store.showButtonsSelf === "disable";
    return (
        <div className="voice-user-button-container">
            <Tooltip text={tooltip} shouldShow={!disabled}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <Button
                        size={Button.Sizes.MIN}
                        color={Button.Colors.TRANSPARENT}
                        look={Button.Looks.BLANK}
                        disabled={disabled}
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClick();
                        }}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        {icon}
                    </Button>
                )}
            </Tooltip>
        </div>
    );
}

function getUserName(user: User) {
    const username = `@${user.username}`;
    if (settings.store.whichNameToShow === "global") {
        return user.globalName ?? username;
    } else if (settings.store.whichNameToShow === "nickname") {
        return username;
    } else if (settings.store.whichNameToShow === "both" && user.globalName) {
        return `${user.globalName} / ${username}`;
    }
    return username;
}

export function UserChatButton({ user }: { user: User; }) {
    const isCurrent = (user.id === UserStore.getCurrentUser().id);
    return (
        <VoiceUserButton
            user={user}
            tooltip={isCurrent ? "Navigate to DMs" : `Open DMs with ${getUserName(user)}`}
            icon={<ChatIcon size="sm" />}
            onClick={() => {
                if (isCurrent) {
                    NavigationRouter.transitionTo("/users/@me/");
                    return;
                }
                const chanId = ChannelStore.getDMFromUserId(user.id);
                NavigationRouter.transitionTo(`/channels/@me/${chanId}/`);
            }}
        />
    );
}

export function UserMuteButton({ user }: { user: User; }) {
    const isCurrent = (user.id === UserStore.getCurrentUser().id);
    const isMuted = (isCurrent && MediaEngineStore.isSelfMute()) || MediaEngineStore.isLocalMute(user.id);
    const color = isMuted ? "var(--status-danger)" : "var(--channels-default)";
    return (
        <VoiceUserButton
            user={user}
            tooltip={`${isMuted ? "Unmute" : "Mute"} ${isCurrent ? "yourself" : `${getUserName(user)}`}`}
            icon={isCurrent ? <MuteIconSelf muted={isMuted} size="sm" color={color} /> : <MuteIconOther muted={isMuted} size="sm" color={color} />}
            onClick={() => {
                if (isCurrent) {
                    VoiceActions.toggleSelfMute();
                    return;
                }
                VoiceActions.toggleLocalMute(user.id);
            }}
        />
    );
}

export function UserDeafenButton({ user }: { user: User; }) {
    const isCurrent = (user.id === UserStore.getCurrentUser().id);
    const isMuted = MediaEngineStore.isLocalMute(user.id);
    const isSoundboardMuted = SoundboardStore.isLocalSoundboardMuted(user.id);
    const isVideoDisabled = MediaEngineStore.isLocalVideoDisabled(user.id);
    const isDeafened = isCurrent && MediaEngineStore.isSelfDeaf() || isMuted && isSoundboardMuted && isVideoDisabled;
    const color = isDeafened ? "var(--status-danger)" : "var(--channels-default)";
    return (
        <VoiceUserButton
            user={user}
            tooltip={`${isDeafened ? "Undeafen" : "Deafen"} ${isCurrent ? "yourself" : `${getUserName(user)}`}`}
            icon={isCurrent ? <DeafenIconSelf muted={isDeafened} size="sm" color={color} /> : <DeafenIconOther muted={isDeafened} size="sm" color={color} />}
            onClick={() => {
                if (isCurrent) {
                    VoiceActions.toggleSelfDeaf();
                    return;
                }
                if (isMuted) {
                    VoiceActions.toggleLocalMute(user.id);
                    if (settings.store.muteSoundboard && isSoundboardMuted) {
                        VoiceActions.toggleLocalSoundboardMute(user.id);
                    }
                    if (settings.store.disableVideo && isVideoDisabled) {
                        VoiceActions.setDisableLocalVideo(
                            user.id,
                            "ENABLED",
                            "default"
                        );
                    }
                } else {
                    VoiceActions.toggleLocalMute(user.id);
                    if (settings.store.muteSoundboard && !isSoundboardMuted) {
                        VoiceActions.toggleLocalSoundboardMute(user.id);
                    }
                    if (settings.store.disableVideo && !isVideoDisabled) {
                        VoiceActions.setDisableLocalVideo(
                            user.id,
                            "DISABLED",
                            "default"
                        );
                    }
                }
            }}
        />
    );
}

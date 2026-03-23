/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./VoiceChannelLogEntryComponent.css";

import { openUserProfile } from "@utils/discord";
import { closeAllModals } from "@utils/modal";
import { Channel } from "@vencord/discord-types";
import { ApplicationStore, Clickable, IconUtils, NavigationRouter, Timestamp, Tooltip, UserStore } from "@webpack/common";

import { getCallStartTime } from "../logs";
import { VoiceChannelLogEntry } from "../types";
import { cl, downloadSound, formatElapsedTime, getEmojiUrl, playSound } from "../utils";
import EventIcon from "./VoiceChannelLogEntryIcons";

function getEventDescription(entry: VoiceChannelLogEntry): string {
    switch (entry.type) {
        case "join":
            return "Joined the channel";
        case "leave":
            return "Left the channel";
        case "move":
            if (entry.newChannelId && entry.oldChannelId && entry.channelId === entry.oldChannelId)
                return "Moved to another channel";
            return "Moved from another channel";
        case "soundboard":
            return "";
        case "server_mute":
            return entry.enabled ? "Server muted" : "Server unmuted";
        case "server_deafen":
            return entry.enabled ? "Server deafened" : "Server undeafened";
        case "self_video":
            return entry.enabled ? "Turned on camera" : "Turned off camera";
        case "self_stream":
            return entry.enabled ? "Started screensharing" : "Stopped screensharing";
        case "activity":
            return `Started ${entry.activityName ?? "an activity"}`;
        case "activity_stop":
            return `Stopped ${entry.activityName ?? "an activity"}`;
    }
}

export function VoiceChannelLogEntryComponent({ logEntry, channel }: { logEntry: VoiceChannelLogEntry; channel: Channel; }) {
    const user = UserStore.getUser(logEntry.userId);
    const username = user?.globalName ?? user?.username ?? "Unknown";
    const elapsed = formatElapsedTime(getCallStartTime(), logEntry.timestamp);
    const description = getEventDescription(logEntry);

    return (
        <li className={cl("entry")}>
            <div className={cl("entry-timestamp")}>
                <Timestamp className={cl("timestamp")} timestamp={new Date(logEntry.timestamp)} compact isInline={false} cozyAlt />
                {elapsed && <span className={cl("elapsed")}>{elapsed}</span>}
            </div>
            {(logEntry.type === "activity" || logEntry.type === "activity_stop") && logEntry.applicationId ? (
                <img
                    className={cl("app-icon")}
                    src={IconUtils.getApplicationIconURL({ id: logEntry.applicationId, icon: ApplicationStore.getApplication(logEntry.applicationId)?.icon })}
                    alt={logEntry.activityName ?? "Activity"}
                />
            ) : (
                <EventIcon type={logEntry.type} />
            )}
            <Tooltip text={username}>
                {(tooltipProps: any) => (
                    <img
                        {...tooltipProps}
                        className={cl("avatar")}
                        onClick={() => openUserProfile(logEntry.userId)}
                        src={user ? user.getAvatarURL(channel.getGuildId()) : IconUtils.getDefaultAvatarURL(logEntry.userId)}
                        alt={username}
                    />
                )}
            </Tooltip>
            <div className={cl("content")}>
                <span className={cl("username")} onClick={() => openUserProfile(logEntry.userId)}>{username}</span>
                {logEntry.type === "soundboard" ? (
                    <div className={cl("soundboard-info")}>
                        {logEntry.emoji && <img className={cl("soundboard-emoji")} src={getEmojiUrl(logEntry.emoji)} alt={logEntry.emoji.name} />}
                        <span className={cl("soundboard-id")}>Played a soundboard sound</span>
                        <div className={cl("soundboard-actions")}>
                            <Tooltip text="Play sound">
                                {tooltipProps => (
                                    <Clickable {...tooltipProps} className={cl("soundboard-action")} onClick={() => playSound(logEntry.soundId!)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z" /></svg>
                                    </Clickable>
                                )}
                            </Tooltip>
                            <Tooltip text="Save sound">
                                {tooltipProps => (
                                    <Clickable {...tooltipProps} className={cl("soundboard-action")} onClick={() => downloadSound(logEntry.soundId!)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                    </Clickable>
                                )}
                            </Tooltip>
                        </div>
                    </div>
                ) : (logEntry.type === "activity" || logEntry.type === "activity_stop") && logEntry.applicationId ? (
                    <div className={cl("soundboard-info")}>
                        <span className={cl("soundboard-id")}>{description}</span>
                        <div className={cl("soundboard-actions")}>
                            <Tooltip text="View activity">
                                {tooltipProps => (
                                    <Clickable
                                        {...tooltipProps}
                                        className={cl("soundboard-action")}
                                        onClick={() => {
                                            closeAllModals();
                                            NavigationRouter.transitionTo(`/application-directory/${logEntry.applicationId}`);
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>
                                    </Clickable>
                                )}
                            </Tooltip>
                        </div>
                    </div>
                ) : (
                    <span className={cl("description")}>{description}</span>
                )}
            </div>
        </li>
    );
}

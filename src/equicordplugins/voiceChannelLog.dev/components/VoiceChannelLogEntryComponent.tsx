/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./VoiceChannelLogEntryComponent.css";

import { VoiceChannelLogEntry } from "@equicordplugins/voiceChannelLog.dev/logs";
import { classes } from "@utils/misc";
import { Channel } from "@vencord/discord-types";
import { React, Timestamp, Tooltip, UserStore } from "@webpack/common";
import { Util } from "Vencord";

import { cl } from "..";
import Icon from "./VoiceChannelLogEntryIcons";

export function VoiceChannelLogEntryComponent({ logEntry, channel }: { logEntry: VoiceChannelLogEntry; channel: Channel; }) {
    const user = UserStore.getUser(logEntry.userId);
    return <li className="vc-voice-channel-log">
        <Timestamp className={cl("timestamp")} timestamp={new Date(logEntry.timestamp)} compact isInline={false} cozyAlt></Timestamp>
        <Icon logEntry={logEntry} channel={channel} className={cl("icon")} />
        <Tooltip text={logEntry.username}>
            {(tooltipProps: any) => (
                <img
                    {...tooltipProps}
                    className={classes(cl("avatar"))}
                    onClick={() => Util.openUserProfile(logEntry.userId)}
                    src={user.getAvatarURL(channel.getGuildId())}
                />
            )}
        </Tooltip>
        <div className={cl("content")}>
            { }
        </div>
    </li>;
}

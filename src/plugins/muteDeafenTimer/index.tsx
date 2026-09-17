/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import { formatDuration } from "@utils/text";
import definePlugin, { OptionType } from "@utils/types";
import { React, Text } from "@webpack/common";

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "When to show the duration in server voice channel lists (the call tile always shows it)",
        options: [
            {
                label: "Always visible",
                value: "always",
                default: true
            },
            {
                label: "Only when hovered",
                value: "hover"
            }
        ] as const
    },
    format: {
        type: OptionType.SELECT,
        description: "The timer format",
        options: [
            {
                label: "23:00:42",
                value: "stopwatch",
                default: true
            },
            {
                label: "23h 00m 42s",
                value: "human"
            }
        ] as const
    }
});

const muteSince = new Map<string, number>();
const deafSince = new Map<string, number>();

let currentUserId: string | undefined;

function track(map: Map<string, number>, userId: string, active: boolean) {
    if (active) {
        if (!map.has(userId)) map.set(userId, Date.now());
    } else {
        map.delete(userId);
    }
}

function useLiveDuration(since: number | undefined) {
    const forceUpdate = useForceUpdater();

    React.useEffect(() => {
        if (since == null) return;
        const interval = setInterval(forceUpdate, 1000);
        return () => clearInterval(interval);
    }, [since]);

    return since == null ? null : Date.now() - since;
}

function DurationLabel({ label, since }: { label: string; since: number | undefined; }) {
    const duration = useLiveDuration(since);
    if (duration == null) return <>{label}</>;

    return <>{label} ({formatDuration(duration, settings.store.format === "human")})</>;
}

function InlineDuration({ since, white }: { since: number | undefined; white?: boolean; }) {
    const duration = useLiveDuration(since);
    if (duration == null) return null;

    return (
        <Text
            variant="text-xs/medium"
            color={white ? undefined : "text-muted"}
            style={white ? { marginLeft: 4, color: "#fff" } : { marginLeft: 4 }}
        >
            {formatDuration(duration, settings.store.format === "human")}
        </Text>
    );
}

interface CallTileVoiceState {
    userId: string;
    muted: boolean;
    deafened: boolean;
    localMuted: boolean;
    serverMuted: boolean;
    serverDeafened: boolean;
}

let callTileVoiceState: CallTileVoiceState | undefined;

export default definePlugin({
    name: "MuteDeafenTimer",
    description: "Shows how long someone has been muted or deafened",
    tags: ["Voice", "Utility"],
    authors: [Devs.baiat],
    settings,

    set currentUserId(id: string | undefined) {
        currentUserId = id;
    },

    trackVoiceState(muted: boolean, deafened: boolean) {
        if (!currentUserId) return;
        track(muteSince, currentUserId, muted);
        track(deafSince, currentUserId, deafened);
    },

    set callTileState(state: CallTileVoiceState) {
        callTileVoiceState = state;
        track(muteSince, state.userId, state.muted);
        track(deafSince, state.userId, state.deafened);
    },

    patches: [
        {
            find: "isWatching:",
            all: true,
            replacement: [
                {
                    match: /(let\{iconClassName:\i,mute:(\i),localMute:\i,serverMute:\i,deaf:(\i),serverDeaf:(\i)\}=\i,)(\i)=\[\];/,
                    replace: "$1$5=($self.trackVoiceState($2,$3||$4),[]);",
                    noWarn: true
                },
                {
                    match: /user:(\i),disconnected:\i,isHovered:\i\}=\i;/,
                    replace: "$&$self.currentUserId=$1?.id;",
                    noWarn: true
                },
                {
                    match: /(\i)\.push\(\(0,(\i)\.jsx\)\((\i)\.m,\{text:((?:(?!,children:).)+?),children:(\i)\},"mute"\)\)/,
                    replace: "$1.push((0,$2.jsx)($3.m,{text:$self.wrapMuteText($4),children:$5},\"mute\")),$1.push($self.renderMuteLabel())",
                    noWarn: true
                },
                {
                    match: /(\i)\.push\(\(0,(\i)\.jsx\)\((\i)\.m,\{text:((?:(?!,children:).)+?),children:(\i)\},"deaf"\)\)/,
                    replace: "$1.push((0,$2.jsx)($3.m,{text:$self.wrapDeafText($4),children:$5},\"deaf\")),$1.push($self.renderDeafLabel())",
                    noWarn: true
                }
            ]
        },
        {
            find: "CallTileOverlay",
            all: true,
            replacement: [
                {
                    match: /(participantUserId:(\i),channel:\i,platform:\i,secureFramesVerified:\i,onContextMenu:\i,muted:(\i),deafened:(\i),localMuted:(\i),serverMuted:(\i),serverDeafened:(\i),hasVideo:\i,hideAudioIcon:\i,onToggleMute:\i,popoutType:\i,paused:\i,controlsBottom:\i,streamId:\i\}=)(\i),/,
                    replace: "$1$8,mdtCallTileCapture=($self.callTileState={userId:$2,muted:$3,deafened:$4,localMuted:$5,serverMuted:$6,serverDeafened:$7},0),"
                },
                {
                    match: /\(0,\i\.jsx\)\((\i),\{className:(\i\.\i),size:"xs",color:"currentColor"\},"sound-icon"\)/,
                    replace: "$self.renderCallTileIcon($1,$2)"
                }
            ]
        }
    ],

    wrapMuteText(originalText: string) {
        if (settings.store.mode !== "hover" || !currentUserId) return originalText;

        const since = muteSince.get(currentUserId);
        return since == null ? originalText : <DurationLabel label={originalText} since={since} />;
    },

    wrapDeafText(originalText: string) {
        if (settings.store.mode !== "hover" || !currentUserId) return originalText;

        const since = deafSince.get(currentUserId);
        return since == null ? originalText : <DurationLabel label={originalText} since={since} />;
    },

    renderMuteLabel() {
        if (settings.store.mode !== "always" || !currentUserId) return null;

        const since = muteSince.get(currentUserId);
        if (since != null && since === deafSince.get(currentUserId)) return null;

        return <InlineDuration since={since} />;
    },

    renderDeafLabel() {
        if (settings.store.mode !== "always" || !currentUserId) return null;

        return <InlineDuration since={deafSince.get(currentUserId)} />;
    },

    renderCallTileIcon(Icon: React.ComponentType<any> | null, className: string) {
        if (Icon == null) return null;

        const icon = <Icon key="sound-icon" className={className} size="xs" color="currentColor" />;
        if (!callTileVoiceState) return icon;

        const { userId, muted, deafened, localMuted, serverMuted, serverDeafened } = callTileVoiceState;
        const isDeaf = deafened || serverDeafened;
        const isMute = muted || localMuted || serverMuted;
        const since = isDeaf ? deafSince.get(userId) : isMute ? muteSince.get(userId) : undefined;
        if (since == null) return icon;

        return (
            <span key="sound-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                <Icon className={className} size="xs" color="currentColor" />
                <InlineDuration since={since} white />
            </span>
        );
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: Array<{ userId: string; channelId?: string; mute: boolean; selfMute: boolean; deaf: boolean; selfDeaf: boolean; }>; }) {
            for (const { userId, channelId, mute, selfMute, deaf, selfDeaf } of voiceStates) {
                if (!channelId) {
                    muteSince.delete(userId);
                    deafSince.delete(userId);
                    continue;
                }

                track(muteSince, userId, mute || selfMute);
                track(deafSince, userId, deaf || selfDeaf);
            }
        }
    }
});

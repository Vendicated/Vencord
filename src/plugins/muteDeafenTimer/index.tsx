/*
* Vencord, a Discord client mod
* Copyright (c) 2026 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import { formatDuration } from "@utils/text";
import definePlugin, { OptionType } from "@utils/types";
import { React, Text, Tooltip } from "@webpack/common";

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
let avatarUserId: string | undefined;

function track(map: Map<string, number>, userId: string, active: boolean) {
    if (active) {
        if (!map.has(userId)) map.set(userId, Date.now());
    } else {
        map.delete(userId);
    }
}

const tickListeners = new Set<() => void>();
let tickInterval: ReturnType<typeof setInterval> | undefined;

function subscribeTick(listener: () => void) {
    tickListeners.add(listener);
    tickInterval ??= setInterval(() => {
        for (const l of tickListeners) l();
    }, 1000);

    return () => {
        tickListeners.delete(listener);
        if (tickListeners.size === 0 && tickInterval != null) {
            clearInterval(tickInterval);
            tickInterval = undefined;
        }
    };
}

function useLiveDuration(since: number | undefined) {
    const forceUpdate = useForceUpdater();

    React.useEffect(() => {
        if (since == null) return;
        return subscribeTick(forceUpdate);
    }, [since]);

    return since == null ? null : Date.now() - since;
}

function DurationLabel({ label, since }: { label: string; since: number | undefined; }) {
    const { format } = settings.use(["format"]);
    const duration = useLiveDuration(since);
    if (duration == null) return <>{label}</>;

    return <>{label} ({formatDuration(duration, format === "human")})</>;
}

function InlineDuration({ since, white }: { since: number | undefined; white?: boolean; }) {
    const { format } = settings.use(["format"]);
    const duration = useLiveDuration(since);
    if (duration == null) return null;

    return (
        <Text
            variant="text-xs/medium"
            color={white ? undefined : "text-muted"}
            style={white ? { marginLeft: 4, color: "#fff" } : { marginLeft: 4 }}
        >
            {formatDuration(duration, format === "human")}
        </Text>
    );
}

function HoverDurationText({ original, since }: { original: string; since: number | undefined; }) {
    const { mode } = settings.use(["mode"]);
    if (mode !== "hover" || since == null) return <>{original}</>;

    return <DurationLabel label={original} since={since} />;
}

function AlwaysDurationLabel({ since, hideIfEquals }: { since: number | undefined; hideIfEquals?: number; }) {
    const { mode } = settings.use(["mode"]);
    if (mode !== "always" || since == null) return null;
    if (hideIfEquals != null && since === hideIfEquals) return null;

    return <InlineDuration since={since} />;
}

function wrapDurationText(map: Map<string, number>, originalText: string) {
    if (!currentUserId) return originalText;

    return <HoverDurationText original={originalText} since={map.get(currentUserId)} />;
}

function renderDurationLabel(map: Map<string, number>, dedupeMap?: Map<string, number>) {
    if (!currentUserId) return null;

    return <AlwaysDurationLabel since={map.get(currentUserId)} hideIfEquals={dedupeMap?.get(currentUserId)} />;
}

function AvatarStatusTooltipText({ since, isDeaf }: { since: number; isDeaf: boolean; }) {
    const { format } = settings.use(["format"]);
    const duration = useLiveDuration(since);
    if (duration == null) return null;

    return <>{isDeaf ? "Deafened" : "Muted"} for {formatDuration(duration, format === "human")}</>;
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

    set avatarUserId(id: string | undefined) {
        avatarUserId = id;
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
        },
        {
            find: "isLocalMute",
            all: true,
            replacement: [
                {
                    match: /(let\{userId:(\i),(?:(?!\}=).)*?\}=\i,\i=)(\(0,\i\.\i\)\(\[\i\.\i\],\(\)=>null!=\2&&\i\.\i\.isLocalMute\(\2\)\))/,
                    replace: "$1($self.avatarUserId=$2,$3)",
                    noWarn: true
                },
                {
                    match: /\(0,\i\.jsx\)\((\i),\{color:(\i\.\i\.colors\.\i\.css),style:\{width:(\i\.\i),height:\i\.\i\}\},"status"\)/,
                    replace: "$self.renderAvatarStatusIcon($1,$2,$3)",
                    noWarn: true
                }
            ]
        }
    ],

    wrapMuteText(originalText: string) {
        return wrapDurationText(muteSince, originalText);
    },

    wrapDeafText(originalText: string) {
        return wrapDurationText(deafSince, originalText);
    },

    renderMuteLabel() {
        return renderDurationLabel(muteSince, deafSince);
    },

    renderDeafLabel() {
        return renderDurationLabel(deafSince);
    },

    renderCallTileIcon(Icon: React.ComponentType<any> | null, className: string) {
        if (Icon == null) return null;

        const icon = <Icon className={className} size="xs" color="currentColor" />;
        if (!callTileVoiceState) return React.cloneElement(icon, { key: "sound-icon" });

        const { userId, muted, deafened, localMuted, serverMuted, serverDeafened } = callTileVoiceState;
        const isDeaf = deafened || serverDeafened;
        const isMute = muted || localMuted || serverMuted;
        const since = isDeaf ? deafSince.get(userId) : isMute ? muteSince.get(userId) : undefined;
        if (since == null) return React.cloneElement(icon, { key: "sound-icon" });

        return (
            <span key="sound-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                {icon}
                <InlineDuration since={since} white />
            </span>
        );
    },

    renderAvatarStatusIcon(Icon: React.ComponentType<any> | null, color: string, size: number) {
        if (Icon == null) return null;

        const icon = <Icon key="status" color={color} style={{ width: size, height: size }} />;
        if (!avatarUserId) return icon;

        const isDeaf = deafSince.has(avatarUserId);
        const since = isDeaf ? deafSince.get(avatarUserId) : muteSince.get(avatarUserId);
        if (since == null) return icon;

        return (
            <Tooltip key="status" text={<AvatarStatusTooltipText since={since} isDeaf={isDeaf} />}>
                {tooltipProps => (
                    <span {...tooltipProps} style={{ display: "inline-flex" }}>
                        <Icon color={color} style={{ width: size, height: size }} />
                    </span>
                )}
            </Tooltip>
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

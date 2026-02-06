/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./graphModal.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { OpenExternalIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { isNonNullish } from "@utils/guards";
import { Margins } from "@utils/margins";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Message, User } from "@vencord/discord-types";
import { AuthenticationStore, Menu, SnowflakeUtils, Tooltip, useState } from "@webpack/common";

const userContextPatch: NavContextMenuPatchCallback = (children, { user, latencyHistory }: { user?: User, onClose(): void; latencyHistory: Record<string, number[]>; }) => {
    if (!user) return;
    children.push(
        <Menu.MenuItem
            label="View Latency Graph"
            id="vc-ml-user-latency-graph"
            icon={OpenExternalIcon}
            action={() => openModal(modalProps => <LatencyGraphModal onClose={() => { }} latencyHistory={latencyHistory} />, {})}
        />
    );
};

function LatencyGraph({ data }: { data: number[]; }) {
    // Simple SVG line graph
    const width = 360, height = 120, pad = 20;
    console.log("Rendering latency graph with data:", data);
    if (!data.length) return <Paragraph>No latency data yet.</Paragraph>;
    const max = Math.max(...data, 1);
    const points = data.map((v, i) => {
        const x = pad + (i * (width - 2 * pad)) / Math.max(1, data.length - 1);
        const y = height - pad - ((v / max) * (height - 2 * pad));
        return `${x},${y}`;
    }).join(" ");
    return (
        <svg className="vc-ml-graph-canvas" width={width} height={height}>
            <polyline
                fill="none"
                stroke="var(--status-warning)"
                strokeWidth="2"
                points={points}
            />
            {/* Axes */}
            <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#888" strokeWidth="1" />
            <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#888" strokeWidth="1" />
            {/* Max label */}
            <text x={pad + 4} y={pad + 12} fontSize="12" fill="#888">{max} ms</text>
            <text x={pad + 4} y={height - pad - 4} fontSize="12" fill="#888">0</text>
        </svg>
    );
}

function LatencyGraphModal({ onClose, latencyHistory }: { onClose: () => void; latencyHistory: Record<string, number[]>; }) {
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const userIds = Object.keys(latencyHistory);
    const currentUser = selectedUser ?? userIds[0] ?? null;
    return (
        <ModalRoot transitionState={1}>
            <ModalHeader>
                <Flex justifyContent="space-between" alignItems="center">
                    <Paragraph>Message Latency Graph</Paragraph>
                </Flex>
            </ModalHeader>
            <ModalContent className="vc-ml-graph-modal">
                {userIds.length > 1 && (
                    <Flex alignItems="center" style={{ marginBottom: 12 }}>
                        <Paragraph style={{ marginRight: 8 }}>User:</Paragraph>
                        <select value={currentUser ?? ""} onChange={e => setSelectedUser(e.target.value)}>
                            {userIds.map(uid => <option key={uid} value={uid}>{uid}</option>)}
                        </select>
                    </Flex>
                )}
                <Card>
                    <LatencyGraph data={currentUser ? latencyHistory[currentUser] : []} />
                </Card>
                <Paragraph className={Margins.top16}>
                    This graph shows the most recent message latencies (ms) detected by the plugin for the selected user.
                </Paragraph>
            </ModalContent>
            <ModalFooter>
                <Button onClick={onClose} variant="primary">Close</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

type FillValue = ("status-danger" | "status-warning" | "status-positive" | "text-muted");
type Fill = [FillValue, FillValue, FillValue];
type DiffKey = keyof Diff;

interface Diff {
    days: number,
    hours: number,
    minutes: number,
    seconds: number;
    milliseconds: number;
}

const DISCORD_KT_DELAY = 1471228928;

export default definePlugin({
    name: "MessageLatency",
    description: "Displays an indicator for messages that took ≥n seconds to send",
    authors: [Devs.arHSM, Devs.Fox3000foxy],

    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "user-profile-overflow-menu": userContextPatch
    },

    settings: definePluginSettings({
        latency: {
            type: OptionType.NUMBER,
            description: "Threshold in seconds for latency indicator",
            default: 2
        },
        detectDiscordKotlin: {
            type: OptionType.BOOLEAN,
            description: "Detect old Discord Android clients",
            default: true
        },
        showMillis: {
            type: OptionType.BOOLEAN,
            description: "Show milliseconds",
            default: false
        },
        ignoreSelf: {
            type: OptionType.BOOLEAN,
            description: "Don't add indicator to your own messages",
            default: false
        },
        alwaysDisplayIndicator: {
            type: OptionType.BOOLEAN,
            description: "Always display latency indicator (green)",
            default: false
        }
    }),

    latencyHistory: {},

    patches: [
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /(message:(\i),avatar:\i,username:\(0,\i.jsxs\)\(\i.Fragment,\{children:\[)(\i&&)/,
                replace: "$1$self.Tooltip()({ message: $2 }),$3"
            }
        }
    ],

    addLatencyToHistory(userId: string, latency: number) {
        console.log(`Adding latency ${latency} ms for user ${userId}`);
        if (!this.latencyHistory[userId]) this.latencyHistory[userId] = [];
        if (this.latencyHistory[userId].length > 100) this.latencyHistory[userId].shift();
        this.latencyHistory[userId].push(latency);
        console.log(`Current latency history for user ${userId}:`, this.latencyHistory[userId]);
    },

    stringDelta(delta: number, showMillis: boolean) {
        const diff: Diff = {
            days: Math.floor(delta / (60 * 60 * 24 * 1000)),
            hours: Math.floor((delta / (60 * 60 * 1000)) % 24),
            minutes: Math.floor((delta / (60 * 1000)) % 60),
            seconds: Math.floor(delta / 1000 % 60),
            milliseconds: Math.floor(delta % 1000)
        };

        const str = (k: DiffKey) => diff[k] > 0 ? `${diff[k]} ${diff[k] > 1 ? k : k.substring(0, k.length - 1)}` : null;
        const keys = Object.keys(diff) as DiffKey[];

        const ts = keys.reduce((prev, k) => {
            const s = str(k);

            return prev + (
                isNonNullish(s)
                    ? (prev !== ""
                        ? (showMillis ? k === "milliseconds" : k === "seconds")
                            ? " and "
                            : " "
                        : "") + s
                    : ""
            );
        }, "");

        return ts || "0 seconds";
    },

    latencyTooltipData(message: Message) {
        const { latency, detectDiscordKotlin, showMillis, ignoreSelf, alwaysDisplayIndicator } = this.settings.store;
        const { id, nonce } = message;

        // Message wasn't received through gateway
        if (!isNonNullish(nonce)) return null;

        // Bots basically never send a nonce, and if someone does do it then it's usually not a snowflake
        if (message.author.bot) return null;
        if (ignoreSelf && message.author.id === AuthenticationStore.getId()) return null;


        let isDiscordKotlin = false;
        let delta = SnowflakeUtils.extractTimestamp(id) - SnowflakeUtils.extractTimestamp(nonce); // milliseconds
        if (!showMillis) {
            delta = Math.round(delta / 1000) * 1000;
        }

        // Track latency for graph
        this.addLatencyToHistory(message.author.id, Math.abs(delta));


        // Old Discord Android clients have a delay of around 17 days
        // This is a workaround for that
        if (-delta >= DISCORD_KT_DELAY - 86400000) { // One day of padding for good measure
            isDiscordKotlin = detectDiscordKotlin;
            delta += DISCORD_KT_DELAY;
        }

        // Thanks dziurwa (I hate you)
        // This is when the user's clock is ahead
        // Can't do anything if the clock is behind
        const abs = Math.abs(delta);
        const ahead = abs !== delta;
        const latencyMillis = latency * 1000;

        const stringDelta = abs >= latencyMillis ? this.stringDelta(abs, showMillis) : null;

        // Also thanks dziurwa
        // 2 minutes
        const TROLL_LIMIT = 2 * 60 * 1000;

        let fill: Fill;
        if (alwaysDisplayIndicator) {
            fill = ["status-positive", "status-positive", "status-positive"];
        } else if (isDiscordKotlin) {
            fill = ["status-positive", "status-positive", "text-muted"];
        } else if (delta >= TROLL_LIMIT || ahead) {
            fill = ["text-muted", "text-muted", "text-muted"];
        } else if (delta >= (latencyMillis * 2)) {
            fill = ["status-danger", "text-muted", "text-muted"];
        } else {
            fill = ["status-warning", "status-warning", "text-muted"];
        }

        if (alwaysDisplayIndicator) {
            return { delta: this.stringDelta(abs, showMillis), ahead: false, fill, isDiscordKotlin: false };
        }
        return (abs >= latencyMillis || isDiscordKotlin) ? { delta: stringDelta, ahead, fill, isDiscordKotlin } : null;
    },

    Tooltip() {
        // Add a button to open the graph modal in the tooltip
        return ErrorBoundary.wrap(({ message }: { message: Message; }) => {
            const d = this.latencyTooltipData(message);
            const [modalOpen, setModalOpen] = useState(false);

            if (!isNonNullish(d)) return null;

            let text: string;
            if (!d.delta) {
                text = "User is suspected to be on an old Discord Android client";
            } else {
                text = (d.ahead ? `This user's clock is ${d.delta} ahead.` : `This message was sent with a delay of ${d.delta}.`) + (d.isDiscordKotlin ? " User is suspected to be on an old Discord Android client." : "");
            }

            return <>
                <Tooltip
                    text={<>
                        {text}
                    </>}
                    position="top"
                >
                    {props => <this.Icon delta={d.delta} fill={d.fill} props={props} />}
                </Tooltip>
                {modalOpen && openModal(modalProps => <LatencyGraphModal onClose={() => setModalOpen(false)} latencyHistory={this.latencyHistory} />, {})}
            </>;
        }, { noop: true });
    },

    Icon({ delta, fill, props }: {
        delta: string | null;
        fill: Fill,
        props: {
            onClick(): void;
            onMouseEnter(): void;
            onMouseLeave(): void;
            onContextMenu(): void;
            onFocus(): void;
            onBlur(): void;
            "aria-label"?: string;
        };
    }) {
        return <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            role="img"
            fill="none"
            style={{ marginRight: "8px", verticalAlign: -1 }}
            aria-label={delta ?? "Old Discord Android client"}
            aria-hidden="false"
            {...props}
        >
            <path
                fill={`var(--${fill[0]})`}
                d="M4.8001 12C4.8001 11.5576 4.51344 11.2 4.16023 11.2H2.23997C1.88676 11.2 1.6001 11.5576 1.6001 12V13.6C1.6001 14.0424 1.88676 14.4 2.23997 14.4H4.15959C4.5128 14.4 4.79946 14.0424 4.79946 13.6L4.8001 12Z"
            />
            <path
                fill={`var(--${fill[1]})`}
                d="M9.6001 7.12724C9.6001 6.72504 9.31337 6.39998 8.9601 6.39998H7.0401C6.68684 6.39998 6.40011 6.72504 6.40011 7.12724V13.6727C6.40011 14.0749 6.68684 14.4 7.0401 14.4H8.9601C9.31337 14.4 9.6001 14.0749 9.6001 13.6727V7.12724Z"
            />
            <path
                fill={`var(--${fill[2]})`}
                d="M14.4001 2.31109C14.4001 1.91784 14.1134 1.59998 13.7601 1.59998H11.8401C11.4868 1.59998 11.2001 1.91784 11.2001 2.31109V13.6888C11.2001 14.0821 11.4868 14.4 11.8401 14.4H13.7601C14.1134 14.4 14.4001 14.0821 14.4001 13.6888V2.31109Z"
            />
        </svg>;
    }
});

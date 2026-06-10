/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Channel } from "@vencord/discord-types";
import { findByPropsLazy,findComponentByCodeLazy } from "@webpack";
import {
    ActiveJoinedThreadsStore,
    ChannelStore,
    Checkbox,
    MessageStore,
    Modal,
    moment,
    openModal,
    ReadStateStore,
    ScrollerThin,
    SnowflakeUtils,
    Text,
    useEffect,
    useMemo,
    useState,
    useStateFromStores } from "@webpack/common";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');
const ThreadActions = findByPropsLazy("leaveThread", "joinThread");

export const settings = definePluginSettings({
    inactivityDays: {
        type: OptionType.NUMBER,
        description: "Inactivity Threshold (Days)",
        default: 3
    },
    cleanupDelay: {
        type: OptionType.NUMBER,
        description: "Rate Limit Delay (ms)",
        default: 1000
    }
});

function getThreadLastActive(thread: Channel): number {
    let { lastMessageId } = thread;
    if (!lastMessageId) {
        lastMessageId = ReadStateStore.lastMessageId(thread.id);
    }
    if (!lastMessageId) {
        const messages = MessageStore.getMessages(thread.id);
        if (messages && typeof messages.last === "function") {
            const lastMsg = messages.last();
            if (lastMsg) {
                lastMessageId = lastMsg.id;
            }
        }
    }

    if (lastMessageId) {
        try {
            return SnowflakeUtils.extractTimestamp(lastMessageId);
        } catch {}
    }

    // fallback to snowflake time if we cant find any message
    try {
        return SnowflakeUtils.extractTimestamp(thread.id);
    } catch {
        return 0;
    }
}

interface ModalProps {
    onClose(): void;
    transitionState: any;
    guildId: string;
}

const ThreadTrashBinModal = ErrorBoundary.wrap(({ onClose, transitionState, guildId }: ModalProps) => {
    const [threads, setThreads] = useState<Channel[]>([]);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [isCleaning, setIsCleaning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [totalToClean, setTotalToClean] = useState(0);

    const loadThreads = () => {
        const threadsMap = ActiveJoinedThreadsStore.getActiveJoinedThreadsForGuild(guildId);
        const list = Object.values(threadsMap)
            .flatMap(parentMap => Object.values(parentMap))
            .map(t => t.channel)
            .filter(t => {
                const lastActive = getThreadLastActive(t);
                const cutoff = Date.now() - settings.store.inactivityDays * 24 * 60 * 60 * 1000;
                return lastActive < cutoff;
            });
        setThreads(list);
    };

    useEffect(() => {
        loadThreads();
    }, [guildId]);

    useEffect(() => {
        const initialSelected: Record<string, boolean> = {};
        for (const t of threads) {
            initialSelected[t.id] = true;
        }
        setSelected(initialSelected);
    }, [threads]);

    const selectedCount = useMemo(() => {
        return Object.values(selected).filter(Boolean).length;
    }, [selected]);

    const allSelected = threads.length > 0 && threads.every(t => selected[t.id]);

    const toggleAll = () => {
        const nextState = !allSelected;
        const nextSelected: Record<string, boolean> = {};
        for (const t of threads) {
            nextSelected[t.id] = nextState;
        }
        setSelected(nextSelected);
    };

    const handleThreadToggle = (threadId: string, val: boolean) => {
        setSelected(prev => ({
            ...prev,
            [threadId]: val
        }));
    };

    const startCleanup = async () => {
        const selectedIds = Object.keys(selected).filter(id => selected[id]);
        if (selectedIds.length === 0) return;

        setIsCleaning(true);
        setProgress(0);
        setTotalToClean(selectedIds.length);

        for (let i = 0; i < selectedIds.length; i++) {
            const id = selectedIds[i];
            try {
                const channel = ChannelStore.getChannel(id);
                if (channel) {
                    await ThreadActions.leaveThread(channel);
                }
            } catch (err) {
                console.error("Failed to leave thread " + id, err);
            }
            setProgress(i + 1);
            await new Promise(resolve => setTimeout(resolve, settings.store.cleanupDelay));
        }

        loadThreads();
        setIsCleaning(false);
    };

    const actionText = isCleaning ? `Cleaning... (${progress}/${totalToClean})` : `Clean Up Selected (${selectedCount})`;

    return (
        <Modal
            transitionState={transitionState}
            onClose={onClose}
            title="Thread Trash Bin"
            size="md"
            actions={[
                {
                    text: actionText,
                    variant: "primary" as any,
                    onClick: startCleanup,
                    disabled: isCleaning || selectedCount === 0
                },
                {
                    text: "Close",
                    variant: "secondary" as any,
                    onClick: onClose,
                    disabled: isCleaning
                }
            ]}
        >
            <div style={{ padding: "8px 0" }}>
                <Text variant="text-md/normal" color="text-muted" style={{ marginBottom: "12px" }}>
                    Find and batch-leave threads in this server that have been inactive for more than{" "}
                    <strong>{settings.store.inactivityDays}</strong> days.
                </Text>

                {isCleaning && (
                    <div style={{ marginBottom: "16px", marginTop: "8px" }}>
                        <Text variant="text-sm/semibold" color="header-secondary">
                            Leaving threads: {progress} / {totalToClean}
                        </Text>
                        <div style={{
                            width: "100%",
                            height: "8px",
                            backgroundColor: "var(--background-modifier-accent)",
                            borderRadius: "4px",
                            marginTop: "8px",
                            overflow: "hidden"
                        }}>
                            <div style={{
                                width: `${(progress / totalToClean) * 100}%`,
                                height: "100%",
                                backgroundColor: "var(--brand-experiment)",
                                transition: "width 0.2s ease"
                            }} />
                        </div>
                    </div>
                )}

                {threads.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0" }}>
                        <Text variant="text-md/semibold" color="text-positive">
                            All clean! No inactive joined threads found.
                        </Text>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: "8px" }}>
                            <Checkbox
                                value={allSelected}
                                onChange={(_, val) => toggleAll()}
                                disabled={isCleaning}
                                type="default"
                            >
                                <Text variant="text-md/semibold">Select All ({threads.length} threads found)</Text>
                            </Checkbox>
                        </div>

                        <ScrollerThin className="vc-ttb-list">
                            {threads.map(t => {
                                const parent = ChannelStore.getChannel(t.parent_id);
                                const lastActive = getThreadLastActive(t);
                                const relativeTime = lastActive > 0 ? moment(lastActive).fromNow() : "Unknown";

                                return (
                                    <div key={t.id} className="vc-ttb-thread-row">
                                        <Checkbox
                                            value={!!selected[t.id]}
                                            onChange={(_, val) => handleThreadToggle(t.id, val)}
                                            disabled={isCleaning}
                                            type="default"
                                        />
                                        <div className="vc-ttb-thread-info">
                                            <Text variant="text-md/semibold" color="header-primary">
                                                #{t.name}
                                            </Text>
                                            <div className="vc-ttb-thread-meta">
                                                {parent && (
                                                    <Text variant="text-xs/normal" color="text-muted">
                                                        in #{parent.name}
                                                    </Text>
                                                )}
                                                <Text variant="text-xs/normal" color="text-muted">
                                                    • Active {relativeTime}
                                                </Text>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </ScrollerThin>
                    </>
                )}
            </div>
        </Modal>
    );
});

function ThreadTrashBinButton({ channel }: { channel: Channel }) {
    if (!channel || !channel.guild_id) return null;

    const guildId = channel.guild_id;

    const hasJoinedThreads = useStateFromStores([ActiveJoinedThreadsStore], () => {
        const threadsMap = ActiveJoinedThreadsStore.getActiveJoinedThreadsForGuild(guildId);
        return Object.values(threadsMap).some(parentMap => Object.keys(parentMap).length > 0);
    });

    if (!hasJoinedThreads) return null;

    return (
        <HeaderBarIcon
            className="vc-ttb-btn"
            onClick={() => {
                openModal(props => (
                    <ThreadTrashBinModal
                        {...props}
                        guildId={guildId}
                    />
                ));
            }}
            tooltip="Thread Trash Bin"
            icon={() => (
                <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
                    <path d="M15 4V3H9v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5zM7 19V6h10v13H7zm2-11h2v9H9zm4 0h2v9h-2z" />
                </svg>
            )}
        />
    );
}

export default definePlugin({
    name: "ThreadTrashBin",
    description: "Allows batch-leaving dead or inactive threads you have joined in a server.",
    tags: ["Utility"],
    authors: [Devs.almostkoi],
    settings,

    patches: [
        {
            find: "Missing channel in Channel.renderHeaderToolbar",
            replacement: [
                {
                    match: /(\i)\.push\((.{0,150}?channel:(\i)\},.{0,100}?"notifications"\)\))/g,
                    replace: (m, arrayName, pushContent, channelVar) => {
                        return `${m},${arrayName}.push($self.renderHeaderButton(${channelVar}))`;
                    }
                }
            ]
        }
    ],

    renderHeaderButton(channel: Channel) {
        return <ThreadTrashBinButton channel={channel} />;
    }
});

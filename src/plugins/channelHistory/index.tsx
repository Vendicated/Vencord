
import "./styles.css";

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import {
    ChannelRouter,
    ChannelStore,
    Clickable,
    GuildStore,
    IconUtils,
    Popout,
    React,
    ScrollerThin,
    SelectedChannelStore,
    SelectedGuildStore,
    useEffect,
    useRef,
    useState,
    UserStore
} from "@webpack/common";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";

const cl = classNameFactory("vc-channelHistory-");

const settings = definePluginSettings({
    maxHistorySize: {
        type: OptionType.SLIDER,
        description: "Maximum number of history items to keep",
        markers: [5, 10, 15, 20, 25, 30],
        default: 10,
        stickToMarkers: true
    },
    trackDMs: {
        type: OptionType.BOOLEAN,
        description: "Track direct messages and group chats in history",
        default: true
    },
    persistHistory: {
        type: OptionType.BOOLEAN,
        description: "Persist your channel navigation history across restarts",
        default: true
    }
});

interface HistoryEntry {
    channelId: string;
    guildId: string | null;
}

let historyStack: HistoryEntry[] = [];
let currentIndex = -1;
let isNavigatingHistory = false;
const listeners = new Set<() => void>();

function notifyListeners() {
    for (const listener of listeners) {
        try {
            listener();
        } catch {}
    }
}

const getGuildInitials = (name: string) => {
    return name
        ? name
              .split(" ")
              .map(word => word[0])
              .join("")
              .slice(0, 3)
        : "";
};

const HistoryIcon = ({ width = 16, height = 16, className }: { width?: number | string; height?: number | string; className?: string }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const BackIcon = ({ width = 16, height = 16 }: { width?: number; height?: number }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);

const ForwardIcon = ({ width = 16, height = 16 }: { width?: number; height?: number }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const TrashIcon = ({ width = 14, height = 14 }: { width?: number; height?: number }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const RecentChannelsMenu = ({ closePopout }: { closePopout: () => void }) => {
    const [state, setState] = useState({ history: historyStack, index: currentIndex });

    useEffect(() => {
        const update = () => setState({ history: historyStack, index: currentIndex });
        listeners.add(update);
        return () => {
            listeners.delete(update);
        };
    }, []);

    const handleClear = async (e: React.MouseEvent) => {
        e.stopPropagation();
        historyStack = [];
        currentIndex = -1;
        const currentChannelId = SelectedChannelStore.getChannelId();
        const currentGuildId = SelectedGuildStore.getGuildId();
        if (currentChannelId) {
            historyStack = [{ channelId: currentChannelId, guildId: currentGuildId ?? null }];
            currentIndex = 0;
        }
        if (settings.store.persistHistory) {
            await DataStore.set("ChannelHistory_stack", historyStack);
            await DataStore.set("ChannelHistory_index", currentIndex);
        }
        notifyListeners();
    };

    const handleNavigate = (idx: number) => {
        if (idx < 0 || idx >= state.history.length) return;
        isNavigatingHistory = true;
        const target = state.history[idx];
        ChannelRouter.transitionToChannel(target.channelId);
        currentIndex = idx;
        if (settings.store.persistHistory) {
            DataStore.set("ChannelHistory_index", currentIndex);
        }
        notifyListeners();
        closePopout();
    };

    const handleBack = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (state.index > 0) {
            isNavigatingHistory = true;
            const target = state.history[state.index - 1];
            ChannelRouter.transitionToChannel(target.channelId);
            currentIndex = state.index - 1;
            if (settings.store.persistHistory) {
                DataStore.set("ChannelHistory_index", currentIndex);
            }
            notifyListeners();
        }
    };

    const handleForward = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (state.index < state.history.length - 1) {
            isNavigatingHistory = true;
            const target = state.history[state.index + 1];
            ChannelRouter.transitionToChannel(target.channelId);
            currentIndex = state.index + 1;
            if (settings.store.persistHistory) {
                DataStore.set("ChannelHistory_index", currentIndex);
            }
            notifyListeners();
        }
    };

    return (
        <div className="vc-channelHistory-popout">
            <div className="vc-channelHistory-header">
                <span className="vc-channelHistory-title">Channel History</span>
                <div className="vc-channelHistory-nav-buttons">
                    <button
                        className="vc-channelHistory-nav-btn"
                        onClick={handleBack}
                        disabled={state.index <= 0}
                        title="Back"
                    >
                        <BackIcon />
                    </button>
                    <button
                        className="vc-channelHistory-nav-btn"
                        onClick={handleForward}
                        disabled={state.index >= state.history.length - 1}
                        title="Forward"
                    >
                        <ForwardIcon />
                    </button>
                    <button
                        className="vc-channelHistory-clear-btn"
                        onClick={handleClear}
                        title="Clear History"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>
            <ScrollerThin className="vc-channelHistory-list">
                {state.history.length === 0 ? (
                    <div className="vc-channelHistory-empty">No history yet</div>
                ) : (
                    state.history.map((_, i) => {
                        const index = state.history.length - 1 - i;
                        const item = state.history[index];
                        const channel = ChannelStore.getChannel(item.channelId);
                        let displayName = "Unknown Channel";
                        let categoryName = "Private/Deleted";
                        let iconUrl: string | null = null;
                        let initials = "";

                        if (channel) {
                            if (channel.isDM && channel.isDM()) {
                                const recipientId = channel.recipients?.[0] || channel.rawRecipients?.[0]?.id;
                                const user = recipientId ? UserStore.getUser(recipientId) : null;
                                displayName = user ? (user.globalName || user.username) : (channel.rawRecipients?.[0]?.username || "Direct Message");
                                iconUrl = user ? (IconUtils.getUserAvatarURL(user) ?? null) : null;
                                categoryName = "Direct Message";
                            } else if (channel.isGroupDM && channel.isGroupDM()) {
                                displayName = channel.name || channel.rawRecipients?.map((r: any) => r.username).join(", ") || "Group DM";
                                iconUrl = IconUtils.getChannelIconURL(channel) ?? null;
                                categoryName = "Group DM";
                            } else {
                                displayName = channel.name ? `# ${channel.name}` : "Channel";
                                const guild = GuildStore.getGuild(channel.guild_id);
                                if (guild) {
                                    categoryName = guild.name;
                                    iconUrl = IconUtils.getGuildIconURL(guild) ?? null;
                                    initials = getGuildInitials(guild.name);
                                } else {
                                    categoryName = "Server";
                                }
                            }
                        }

                        const isActive = index === state.index;

                        return (
                            <Clickable
                                key={`${item.channelId}-${index}`}
                                className={`vc-channelHistory-item ${isActive ? "vc-channelHistory-item-active" : ""}`}
                                onClick={() => handleNavigate(index)}
                            >
                                {iconUrl ? (
                                    <img src={iconUrl} className="vc-channelHistory-avatar" alt="" />
                                ) : (
                                    <div className="vc-channelHistory-guild-icon-fallback">
                                        {initials || "?"}
                                    </div>
                                )}
                                <div className="vc-channelHistory-item-details">
                                    <div className="vc-channelHistory-item-name">{displayName}</div>
                                    <div className="vc-channelHistory-item-category">{categoryName}</div>
                                </div>
                            </Clickable>
                        );
                    })
                )}
            </ScrollerThin>
        </div>
    );
};

const ChannelHistoryButton: ChatBarButtonFactory = ({ isAnyChat }) => {
    const buttonRef = useRef<HTMLSpanElement>(null);
    const [show, setShow] = useState(false);

    if (!isAnyChat) return null;

    return (
        <Popout
            position="top"
            align="center"
            shouldShow={show}
            onRequestClose={() => setShow(false)}
            targetElementRef={buttonRef}
            renderPopout={() => <RecentChannelsMenu closePopout={() => setShow(false)} />}
        >
            {() => (
                <span ref={buttonRef}>
                    <ChatBarButton
                        tooltip="Channel History"
                        onClick={() => setShow(v => !v)}
                    >
                        <HistoryIcon />
                    </ChatBarButton>
                </span>
            )}
        </Popout>
    );
};

export default definePlugin({
    name: "ChannelHistory",
    description: "Adds a channel navigation history (Back/Forward) and a list of recently visited channels/DMs to the chat bar.",
    tags: ["Utility", "Organisation", "Chat"],
    authors: [Devs.almostkoi],
    settings,

    flux: {
        async CHANNEL_SELECT({ channelId, guildId }) {
            if (isNavigatingHistory) {
                isNavigatingHistory = false;
                return;
            }

            if (!channelId) return;

            const channel = ChannelStore.getChannel(channelId);
            const isDM = channel && (channel.isDM?.() || channel.isGroupDM?.());
            if (isDM && !settings.store.trackDMs) return;

            if (currentIndex >= 0 && historyStack[currentIndex]?.channelId === channelId) {
                return;
            }

            if (currentIndex < historyStack.length - 1) {
                historyStack = historyStack.slice(0, currentIndex + 1);
            }

            historyStack.push({ channelId, guildId: guildId ?? null });

            const maxLimit = settings.store.maxHistorySize || 10;
            if (historyStack.length > maxLimit) {
                historyStack.shift();
            }

            currentIndex = historyStack.length - 1;

            if (settings.store.persistHistory) {
                await DataStore.set("ChannelHistory_stack", historyStack);
                await DataStore.set("ChannelHistory_index", currentIndex);
            }
            notifyListeners();
        }
    },

    async start() {
        if (settings.store.persistHistory) {
            const savedStack = await DataStore.get<HistoryEntry[]>("ChannelHistory_stack");
            const savedIndex = await DataStore.get<number>("ChannelHistory_index");
            if (Array.isArray(savedStack)) {
                historyStack = savedStack.filter(item => item && typeof item.channelId === "string");
                if (typeof savedIndex === "number" && savedIndex >= 0 && savedIndex < historyStack.length) {
                    currentIndex = savedIndex;
                } else {
                    currentIndex = historyStack.length - 1;
                }
            }
        }

        if (historyStack.length === 0) {
            const currentChannelId = SelectedChannelStore.getChannelId();
            const currentGuildId = SelectedGuildStore.getGuildId();
            if (currentChannelId) {
                historyStack = [{ channelId: currentChannelId, guildId: currentGuildId ?? null }];
                currentIndex = 0;
            }
        }
        notifyListeners();
    },

    chatBarButton: {
        icon: HistoryIcon,
        render: ChannelHistoryButton
    }
});

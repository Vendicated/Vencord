import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { 
    React,
    UserStore,
    ChannelStore
} from "@webpack/common";
import { Devs } from "@utils/constants";

export const settings = definePluginSettings({
    streaksJson: {
        type: OptionType.STRING,
        description: "Serialized streak data (JSON)",
        default: "{}",
    }
});

interface StreakData {
    count: number;
    lastMessageDate: string; // YYYY-MM-DD
    lastIncrementDate: string; // YYYY-MM-DD
    todayMe: boolean;
    todayThem: boolean;
}

function FireIcon() {
    return (
        <svg 
            viewBox="0 0 24 24" 
            width={20} 
            height={20} 
            style={{ 
                display: "inline-block",
                verticalAlign: "middle",
                filter: "drop-shadow(0 0 4px rgba(255, 90, 0, 0.7))"
            }}
        >
            <defs>
                <linearGradient id="fireGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#ff1f00" />
                    <stop offset="50%" stopColor="#ff7b00" />
                    <stop offset="100%" stopColor="#ffdd00" />
                </linearGradient>
            </defs>
            <path 
                fill="url(#fireGradient)" 
                d="M17.66 11.57c-.77-1.39-2.03-2.42-3.25-3.41-1.32-1.07-2.61-2.28-3.06-3.89-.07-.24-.4-.31-.55-.1-.99 1.42-1.5 3.07-1.5 5 0 2.35 1.9 4.07 4.25 4.07.1 0 .2 0 .3-.01.23-.03.35-.29.23-.49-.43-.72-.73-1.61-.73-2.55 0-1.89 1.09-3.2 2.2-4.4.15-.17.43-.06.43.17 0 .56-.05 1.13-.02 1.7.06 1.13.56 2.19 1.25 3.08.15.19.46.12.53-.1.4-1.28.61-2.45.67-3.6.01-.22.28-.31.42-.15 1.5 1.68 2.27 3.96 1.82 6.32-.4 2.13-2.07 3.88-4.22 4.21-3.69.57-6.85-2.09-6.85-5.6 0-1.92.71-3.64 1.88-4.99.15-.17.03-.45-.2-.42-2.14.35-4.13 1.61-5.06 3.56-.99 2.08-.85 4.67.57 6.6 1.95 2.67 5.43 3.93 8.72 2.9 3.11-.97 5.25-3.9 5.25-7.15 0-.8-.11-1.58-.29-2.31-.05-.22-.32-.28-.43-.09z"
            />
        </svg>
    );
}

function updateStreak(channelId: string, senderId: string, sharedCount?: number) {
    try {
        const myUser = UserStore.getCurrentUser();
        if (!myUser) return;

        const myId = myUser.id;
        const isMe = senderId === myId;
        
        const todayStr = new Date().toLocaleDateString("en-CA");
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString("en-CA");

        let streaks: Record<string, StreakData> = {};
        try {
            streaks = JSON.parse(settings.store.streaksJson ?? "{}");
        } catch {
            streaks = {};
        }

        let data = streaks[channelId] || {
            count: 0,
            lastMessageDate: "",
            lastIncrementDate: "",
            todayMe: false,
            todayThem: false
        };

        if (sharedCount !== undefined) {
            data.count = sharedCount;
            data.lastMessageDate = todayStr;
            data.lastIncrementDate = todayStr;
            data.todayMe = true;
            data.todayThem = true;
        } else {
            if (data.lastMessageDate === "") {
                data.lastMessageDate = todayStr;
                if (isMe) data.todayMe = true;
                else data.todayThem = true;
            } else if (data.lastMessageDate !== todayStr && data.lastMessageDate !== yesterdayStr) {
                data.count = 0;
                data.lastIncrementDate = "";
                data.lastMessageDate = todayStr;
                data.todayMe = isMe;
                data.todayThem = !isMe;
            } else {
                if (data.lastMessageDate === yesterdayStr) {
                    data.lastMessageDate = todayStr;
                    data.todayMe = isMe;
                    data.todayThem = !isMe;
                } else {
                    if (isMe) data.todayMe = true;
                    else data.todayThem = true;
                }
            }

            if (data.todayMe && data.todayThem) {
                if (data.lastIncrementDate !== todayStr) {
                    if (data.count === 0) data.count = 1;
                    else data.count += 1;
                    data.lastIncrementDate = todayStr;
                }
            }
        }

        streaks[channelId] = data;
        settings.store.streaksJson = JSON.stringify(streaks);
    } catch (e) {
        console.error("[DMStreaks] Error in updateStreak:", e);
    }
}

export default definePlugin({
    name: "DMStreaks",
    description: "Displays a Snapchat-like message streak counter next to DMs. Automatically synchronizes with other users of this plugin.",
    authors: [Devs.papa],
    
    dependencies: ["MemberListDecoratorsAPI", "MessageEventsAPI"],
    settings,

    start() {
        console.log("[DMStreaks] Plugin started.");
    },

    stop() {
        console.log("[DMStreaks] Plugin stopped.");
    },

    onBeforeMessageSend(channelId, msg) {
        try {
            const channel = ChannelStore.getChannel(channelId);
            if (channel && channel.type === 1) {
                const myUser = UserStore.getCurrentUser();
                if (myUser) {
                    updateStreak(channelId, myUser.id);

                    let streaks: Record<string, StreakData> = {};
                    try {
                        streaks = JSON.parse(settings.store.streaksJson ?? "{}");
                    } catch {
                        streaks = {};
                    }

                    const streak = streaks[channelId];
                    if (streak && streak.count > 0) {
                        const zwnj = "\u200c";
                        const zwj = "\u200d";
                        const signature = "\u200b\u200b\u200c" + zwj.repeat(streak.count) + zwnj;
                        msg.content = msg.content + signature;
                    }
                }
            }
        } catch (e) {
            console.error("[DMStreaks] Error in onBeforeMessageSend:", e);
        }
    },

    renderMemberListDecorator(props) {
        if (props.type !== "dm" || !props.channel) return null;

        const channelId = props.channel.id;
        
        let streaks: Record<string, StreakData> = {};
        try {
            streaks = JSON.parse(settings.store.streaksJson ?? "{}");
        } catch {
            streaks = {};
        }

        const streak = streaks[channelId];
        if (streak && streak.count > 0) {
            return (
                <span 
                    className="vc-dm-streak-badge" 
                    style={{ 
                        marginLeft: "8px", 
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        transform: "translateY(-1px)",
                        lineHeight: "1"
                    }}
                    title={`You are on a ${streak.count} day message streak! 🔥`}
                >
                    <FireIcon />
                    <span 
                        style={{ 
                            color: "#ffaa00", 
                            fontWeight: "bold",
                            fontSize: "14px",
                            lineHeight: "1"
                        }}
                    >
                        {streak.count}
                    </span>
                </span>
            );
        }

        return null;
    },

    flux: {
        MESSAGE_CREATE({ message }) {
            try {
                if (!message || !message.author) return;

                const channel = ChannelStore.getChannel(message.channel_id);
                if (!channel || channel.type !== 1) return;

                const myUser = UserStore.getCurrentUser();
                if (!myUser) return;

                if (message.author.id !== myUser.id) {
                    const match = message.content?.match(/\u200b\u200b\u200c(\u200d*)\u200c/);
                    if (match) {
                        const sharedCount = match[1].length;
                        updateStreak(message.channel_id, message.author.id, sharedCount);
                    } else {
                        updateStreak(message.channel_id, message.author.id);
                    }
                }
            } catch (e) {
                console.error("[DMStreaks] Error in MESSAGE_CREATE:", e);
            }
        }
    }
});

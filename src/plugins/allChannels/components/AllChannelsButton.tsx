import { openModal } from "@utils/modal";
import { FluxDispatcher,GuildChannelStore, GuildStore, ReadStateStore, useEffect, useState } from "@webpack/common";

import { AllChannelsModal } from "./AllChannelsModal";

function useUnreadCount(): number {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const calculateUnread = () => {
            let unreadCount = 0;
            const guilds = Object.values(GuildStore.getGuilds());

            for (const guild of guilds) {
                const guildChannels = GuildChannelStore.getChannels(guild.id);
                if (guildChannels?.SELECTABLE) {
                    for (const { channel } of guildChannels.SELECTABLE) {
                        if (channel && ReadStateStore.hasUnread(channel.id)) {
                            unreadCount++;
                        }
                    }
                }
            }
            setCount(unreadCount);
        };

        calculateUnread();

        const handleUpdate = () => calculateUnread();

        FluxDispatcher.subscribe("MESSAGE_CREATE", handleUpdate);
        FluxDispatcher.subscribe("MESSAGE_ACK", handleUpdate);
        FluxDispatcher.subscribe("CHANNEL_SELECT", handleUpdate);

        return () => {
            FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleUpdate);
            FluxDispatcher.unsubscribe("MESSAGE_ACK", handleUpdate);
            FluxDispatcher.unsubscribe("CHANNEL_SELECT", handleUpdate);
        };
    }, []);

    return count;
}

export function AllChannelsButton() {
    const unreadCount = useUnreadCount();
    const [isHovered, setIsHovered] = useState(false);

    const SQUIRCLE_CLIP = "path('M0 17.4545C0 11.3449 0 8.29005 1.18902 5.95647C2.23491 3.90379 3.90379 2.23491 5.95647 1.18902C8.29005 0 11.3449 0 17.4545 0H22.5455C28.6551 0 31.71 0 34.0435 1.18902C36.0962 2.23491 37.7651 3.90379 38.811 5.95647C40 8.29005 40 11.3449 40 17.4545V22.5455C40 28.6551 40 31.71 38.811 34.0435C37.7651 36.0962 36.0962 37.7651 34.0435 38.811C31.71 40 28.6551 40 22.5455 40H17.4545C11.3449 40 8.29005 40 5.95647 38.811C3.90379 37.7651 2.23491 36.0962 1.18902 34.0435C0 31.71 0 28.6551 0 22.5455V17.4545Z')";

    const badgeStyle: React.CSSProperties = {
        position: "absolute",
        bottom: "0px",
        right: "0px",
        backgroundColor: "#f23f43",
        color: "#ffffff",
        fontSize: "10px",
        fontWeight: 700,
        minWidth: "16px",
        height: "16px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px",
        boxSizing: "border-box",
        border: "3px solid #1e1f22"
    };

    const pillStyle: React.CSSProperties = {
        position: "absolute",
        left: "0px",
        width: "4px",
        height: isHovered ? "20px" : (unreadCount > 0 ? "8px" : "0px"),
        borderRadius: "0 4px 4px 0",
        backgroundColor: "#ffffff",
        transition: "height 0.15s ease-out",
        opacity: isHovered || unreadCount > 0 ? 1 : 0
    };

    return (
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "72px", height: "48px" }}>
            <div style={pillStyle} />
            <div
                style={{
                    position: "relative",
                    width: "48px",
                    height: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                }}
                onClick={() => openModal(props => <AllChannelsModal {...props} />)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                title="All Channels"
                role="button"
                tabIndex={0}
            >
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        clipPath: SQUIRCLE_CLIP,
                        backgroundColor: isHovered ? "#5865f2" : "#313338",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background-color 0.15s ease-out"
                    }}
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill={isHovered ? "#ffffff" : "#dbdee1"}
                        style={{ transition: "fill 0.15s ease-out" }}
                    >
                        <path d="M2 4.5A2.5 2.5 0 0 1 4.5 2h4A2.5 2.5 0 0 1 11 4.5v4A2.5 2.5 0 0 1 8.5 11h-4A2.5 2.5 0 0 1 2 8.5v-4zM4.5 4a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-4zM13 4.5A2.5 2.5 0 0 1 15.5 2h4A2.5 2.5 0 0 1 22 4.5v4a2.5 2.5 0 0 1-2.5 2.5h-4A2.5 2.5 0 0 1 13 8.5v-4zm2.5-.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-4zM2 15.5A2.5 2.5 0 0 1 4.5 13h4a2.5 2.5 0 0 1 2.5 2.5v4A2.5 2.5 0 0 1 8.5 22h-4A2.5 2.5 0 0 1 2 19.5v-4zM4.5 15a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-4zM13 15.5a2.5 2.5 0 0 1 2.5-2.5h4a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5h-4a2.5 2.5 0 0 1-2.5-2.5v-4zm2.5-.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-4z"/>
                    </svg>
                </div>
                {unreadCount > 0 && (
                    <span style={badgeStyle}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </div>
        </div>
    );
}

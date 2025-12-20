/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { closeModal, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { ChannelStore, MessageStore, Tooltip, useEffect, UserStore, useState } from "@webpack/common";

import { Boo, clearChannelFromGhost, getBooCount, getGhostedChannels, onBooCountChange } from "./Boo";
import { GhostedUsersModal } from "./GhostedUsersModal";
import { IconGhost } from "./IconGhost";

export const cl = classNameFactory("vc-boo-");

export const settings = definePluginSettings({
    showIndicator: {
        type: OptionType.BOOLEAN,
        description: "Show the ghost counter at the top of the server list",
        default: true,
        restartNeeded: false
    },
    showDmIcons: {
        type: OptionType.BOOLEAN,
        description: "Show ghost icons next to individual DMs",
        default: true,
        restartNeeded: false
    },
    exemptedChannels: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs to exempt from ghosting (right-click a DM channel to copy its ID)",
        default: "",
        restartNeeded: false
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Ignore DMs from bots",
        default: true,
        restartNeeded: false
    }
});

function getChannelDisplayName(channelId: string): string {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return "Unknown";

    // get last message to determine sender for group DMs
    const lastMessage = MessageStore.getMessages(channelId)?.last();

    // check if it's a group DM
    if (channel.recipients?.length > 1 && lastMessage) {
        // show last message sender for group DMs
        const lastSender = UserStore.getUser(lastMessage.author.id);
        return lastSender?.username || "Unknown User";
    }

    // 1-on-1 DM
    const recipientId = channel.recipients?.[0];
    const user = UserStore.getUser(recipientId);
    return user?.username || "Unknown User";
}

function BooIndicator() {
    const [count, setCount] = useState(getBooCount());
    const [showJumpscare, setShowJumpscare] = useState(false);

    useEffect(() => {
        const unsubscribe = onBooCountChange(newCount => {
            setCount(newCount);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    if (!settings.store.showIndicator && !showJumpscare) return null;

    const handleClick = () => {
        const ghostedChannels = getGhostedChannels();
        const modalKey = openModal(modalProps => (
            <ErrorBoundary>
                <GhostedUsersModal
                    modalProps={modalProps}
                    ghostedChannels={ghostedChannels}
                    onClose={() => closeModal(modalKey)}
                    onClearGhost={clearChannelFromGhost}
                />
            </ErrorBoundary>
        ));
    };

    const getTooltipText = () => {
        const ghostedChannels = getGhostedChannels();
        if (ghostedChannels.length === 0) {
            return "No Ghosted Users";
        }
        if (ghostedChannels.length <= 5) {
            return ghostedChannels
                .map(id => getChannelDisplayName(id))
                .join(", ");
        }
        return `${ghostedChannels.length} Ghosted Users`;
    };

    return (
        <>
            {settings.store.showIndicator && (
                <div id={cl("container")}>
                    <Tooltip text={getTooltipText()} position="right">
                        {({ onMouseEnter, onMouseLeave }) => (
                            <div
                                id={cl("container")}
                                className={cl("clickable")}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                onClick={handleClick}
                            >
                                {count} <IconGhost fill="currentColor" />
                            </div>
                        )}
                    </Tooltip>
                </div>
            )}
        </>
    );
}

migratePluginSettings("Ghosted", "Boo");
export default definePlugin({
    name: "Ghosted",
    description: "A cute ghost will appear if you don't answer their DMs",
    authors: [EquicordDevs.vei, Devs.sadan, EquicordDevs.justjxke],
    settings,
    dependencies: ["AudioPlayerAPI"],

    patches: [
        {
            find: "interactiveSelected]",
            replacement: {
                match: /interactiveSelected.{0,50}children:\[/,
                replace: "$&$self.renderBoo(arguments[0]),"
            }
        },
    ],

    renderBoo(props: { channel: Channel; }) {
        return (
            <ErrorBoundary noop>
                <Boo {...props} />
            </ErrorBoundary>
        );
    },

    renderIndicator() {
        return (
            <ErrorBoundary noop>
                <BooIndicator />
            </ErrorBoundary>
        );
    },

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderIndicator);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderIndicator);
    },
});

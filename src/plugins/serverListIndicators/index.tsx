/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { GuildStore, PresenceStore, RelationshipStore, useStateFromStores } from "@webpack/common";

const enum IndicatorType {
    SERVER = 1 << 0,
    FRIEND = 1 << 1,
    BOTH = SERVER | FRIEND,
}

const UserGuildJoinRequestStore = findStoreLazy("UserGuildJoinRequestStore");

function FriendsIndicator() {
    const onlineFriendsCount = useStateFromStores([RelationshipStore, PresenceStore], () => {
        let count = 0;

        const friendIds = RelationshipStore.getFriendIDs();
        for (const id of friendIds) {
            const status = PresenceStore.getStatus(id) ?? "offline";
            if (status === "offline") {
                continue;
            }

            count++;
        }

        return count;
    });

    return (
        <span id="vc-friendcount" style={{
            display: "inline-block",
            width: "100%",
            fontSize: "12px",
            fontWeight: "600",
            color: "var(--text-default)",
            textTransform: "uppercase",
            textAlign: "center",
        }}>
            {onlineFriendsCount} online
        </span>
    );
}

function ServersIndicator() {
    const guildCount = useStateFromStores([GuildStore, UserGuildJoinRequestStore], () => {
        const guildJoinRequests: string[] = UserGuildJoinRequestStore.computeGuildIds();
        const guilds = GuildStore.getGuilds();

        // Filter only pending guild join requests
        return GuildStore.getGuildCount() + guildJoinRequests.filter(id => guilds[id] == null).length;
    });

    return (
        <span id="vc-guildcount" style={{
            display: "inline-block",
            width: "100%",
            fontSize: "12px",
            fontWeight: "600",
            color: "var(--text-default)",
            textTransform: "uppercase",
            textAlign: "center",
        }}>
            {guildCount} servers
        </span>
    );
}

export default definePlugin({
    name: "ServerListIndicators",
    description: "Add online friend count or server count in the server list",
    authors: [Devs.dzshn],
    dependencies: ["ServerListAPI"],

    options: {
        mode: {
            description: "mode",
            type: OptionType.SELECT,
            options: [
                { label: "Only online friend count", value: IndicatorType.FRIEND, default: true },
                { label: "Only server count", value: IndicatorType.SERVER },
                { label: "Both server and online friend counts", value: IndicatorType.BOTH },
            ]
        }
    },

    renderIndicator: () => {
        const { mode } = Settings.plugins.ServerListIndicators;
        return <ErrorBoundary noop>
            <div style={{ marginBottom: "4px" }}>
                {!!(mode & IndicatorType.FRIEND) && <FriendsIndicator />}
                {!!(mode & IndicatorType.SERVER) && <ServersIndicator />}
            </div>
        </ErrorBoundary>;
    },

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderIndicator);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderIndicator);
    }
});

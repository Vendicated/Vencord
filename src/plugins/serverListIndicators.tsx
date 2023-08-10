/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Sofia Lima
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { GuildStore, PresenceStore, RelationshipStore } from "@webpack/common";

const enum IndicatorType {
    SERVER = 1 << 0,
    FRIEND = 1 << 1,
    BOTH = SERVER | FRIEND,
}

let onlineFriends = 0;
let guildCount = 0;
let forceUpdateFriendCount: () => void;
let forceUpdateGuildCount: () => void;

function FriendsIndicator() {
    forceUpdateFriendCount = useForceUpdater();

    return (
        <span id="vc-friendcount" style={{
            display: "inline-block",
            width: "100%",
            fontSize: "12px",
            fontWeight: "600",
            color: "var(--header-secondary)",
            textTransform: "uppercase",
            textAlign: "center",
        }}>
            {onlineFriends} online
        </span>
    );
}

function ServersIndicator() {
    forceUpdateGuildCount = useForceUpdater();

    return (
        <span id="vc-guildcount" style={{
            display: "inline-block",
            width: "100%",
            fontSize: "12px",
            fontWeight: "600",
            color: "var(--header-secondary)",
            textTransform: "uppercase",
            textAlign: "center",
        }}>
            {guildCount} servers
        </span>
    );
}

function handlePresenceUpdate() {
    onlineFriends = 0;
    const relations = RelationshipStore.getRelationships();
    for (const id of Object.keys(relations)) {
        const type = relations[id];
        // FRIEND relationship type
        if (type === 1 && PresenceStore.getStatus(id) !== "offline") {
            onlineFriends += 1;
        }
    }
    forceUpdateFriendCount?.();
}

function handleGuildUpdate() {
    guildCount = GuildStore.getGuildCount();
    forceUpdateGuildCount?.();
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

    flux: {
        PRESENCE_UPDATES: handlePresenceUpdate,
        GUILD_CREATE: handleGuildUpdate,
        GUILD_DELETE: handleGuildUpdate,
    },


    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderIndicator);

        handlePresenceUpdate();
        handleGuildUpdate();
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderIndicator);
    }
});

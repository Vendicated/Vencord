/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Sofia Lima
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { Settings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, GuildStore,PresenceStore, RelationshipStore } from "@webpack/common";

enum IndicatorType {
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

    handlePresenceUpdate() {
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
    },

    handleGuildUpdate() {
        guildCount = GuildStore.getGuildCount();
        forceUpdateGuildCount?.();
    },

    start() {
        this.handlePresenceUpdate();
        this.handleGuildUpdate();
        addServerListElement(ServerListRenderPosition.Above, this.renderIndicator);
        FluxDispatcher.subscribe("PRESENCE_UPDATES", this.handlePresenceUpdate);
        FluxDispatcher.subscribe("GUILD_CREATE", this.handleGuildUpdate);
        FluxDispatcher.subscribe("GUILD_DELETE", this.handleGuildUpdate);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderIndicator);
        FluxDispatcher.unsubscribe("PRESENCE_UPDATES", this.handlePresenceUpdate);
        FluxDispatcher.unsubscribe("GUILD_CREATE", this.handleGuildUpdate);
        FluxDispatcher.unsubscribe("GUILD_DELETE", this.handleGuildUpdate);
    }
});

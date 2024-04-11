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
import { Settings } from "@api/Settings";
import { enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { GuildStore, PresenceStore, RelationshipStore, Tooltip } from "@webpack/common";

import style from "./styles.css?managed";

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
        <div id="vc-friendcount">
            <svg
                id="vc-friendcount-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                fill="currentColor"
                viewBox="0 0 24 24">
                <path fill="currentColor"
                    d="M13 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                <path
                    fill="currentColor"
                    d="M3 5v-.75C3 3.56 3.56 3 4.25 3s1.24.56 1.33 1.25C6.12 8.65 9.46 12 13 12h1a8 8 0 0 1 8 8 2 2 0 0 1-2 2 .21.21 0 0 1-.2-.15 7.65 7.65 0 0 0-1.32-2.3c-.15-.2-.42-.06-.39.17l.25 2c.02.15-.1.28-.25.28H9a2 2 0 0 1-2-2v-2.22c0-1.57-.67-3.05-1.53-4.37A15.85 15.85 0 0 1 3 5Z">
                </path></svg>
            <span id="vc-friendcount-text">
                {onlineFriends}
            </span>
        </div>
    );
}

function ServersIndicator() {
    forceUpdateGuildCount = useForceUpdater();

    return (
        <div id="vc-guildcount">
            <div id="vc-guildcount-dot">
                <svg
                    id="vc-guildcount-icon"
                    aria-hidden="true"
                    role="img"
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    fill="currentColor"
                    viewBox="0 0 24 24">
                    <path
                        fill="currentColor"
                        d="M19.73 4.87a18.2 18.2 0 0 0-4.6-1.44c-.21.4-.4.8-.58 1.21-1.69-.25-3.4-.25-5.1 0-.18-.41-.37-.82-.59-1.2-1.6.27-3.14.75-4.6 1.43A19.04 19.04 0 0 0 .96 17.7a18.43 18.43 0 0 0 5.63 2.87c.46-.62.86-1.28 1.2-1.98-.65-.25-1.29-.55-1.9-.92.17-.12.32-.24.47-.37 3.58 1.7 7.7 1.7 11.28 0l.46.37c-.6.36-1.25.67-1.9.92.35.7.75 1.35 1.2 1.98 2.03-.63 3.94-1.6 5.64-2.87.47-4.87-.78-9.09-3.3-12.83ZM8.3 15.12c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26s2.02 1.02 2 2.26c0 1.25-.89 2.27-2 2.27Zm7.4 0c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26s2.02 1.02 2 2.26c0 1.25-.88 2.27-2 2.27Z">
                    </path></svg>
            </div>
            <span id="vc-guildcount-text">
                {guildCount}
            </span>
        </div>
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
            <div id="vc-indicators-container">
                <Tooltip text={`${onlineFriends} Friends, ${guildCount} Servers`} position="right">
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div
                            id="vc-serverlist-indicators"
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}>
                            {!!(mode & IndicatorType.FRIEND) && <FriendsIndicator />}
                            {!!(mode & IndicatorType.SERVER) && <ServersIndicator />}
                        </div>
                    )}
                </Tooltip>
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
        enableStyle(style);
        handlePresenceUpdate();
        handleGuildUpdate();

    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderIndicator);
    }
});

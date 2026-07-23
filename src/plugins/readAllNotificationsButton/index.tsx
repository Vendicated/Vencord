/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { TextButton } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ActiveJoinedThreadsStore, FluxDispatcher, GuildChannelStore, ChannelStore, GuildStore, React, ReadStateStore } from "@webpack/common";
import { BaseText } from "@components/index";

function onClickGuilds() {
    const channels: Array<any> = [];

    Object.values(GuildStore.getGuilds()).forEach(guild => {
        GuildChannelStore.getChannels(guild.id).SELECTABLE
            .concat(GuildChannelStore.getChannels(guild.id).VOCAL)
            .concat(
                Object.values(ActiveJoinedThreadsStore.getActiveJoinedThreadsForGuild(guild.id))
                    .flatMap(threadChannels => Object.values(threadChannels))
            )
            .forEach((c: { channel: { id: string; }; }) => {
                if (!ReadStateStore.hasUnread(c.channel.id)) return;

                channels.push({
                    channelId: c.channel.id,
                    messageId: ReadStateStore.lastMessageId(c.channel.id),
                    readStateType: 0
                });
            });
    });

    FluxDispatcher.dispatch({
        type: "BULK_ACK",
        context: "APP",
        channels: channels
    });
}

const DM_TYPES = [1, 3];

function onClickDMs() {
    const channels: Array<any> = [];

    Object.values(ChannelStore.getMutablePrivateChannels())
        .filter(channel => {
            if (!channel || !DM_TYPES.includes(channel.type))
                return false;

            if (!ReadStateStore.hasUnread(channel.id)) return;

            return true;
        })
        .forEach(channel => {
            channels.push({
                channelId: channel.id,
                messageId: ReadStateStore.lastMessageId(channel.id),
                readStateType: 0
            });
        });

    FluxDispatcher.dispatch({
        type: "BULK_ACK",
        context: "APP",
        channels: channels
    });
}

const settings = definePluginSettings({
    visibleButtons: {
        displayName: "Visible Buttons",
        description: "Which buttons to show",
        type: OptionType.SELECT,
        options: [
            { label: "Both", value: 0, default: true },
            { label: "Only Guilds (Servers)", value: 1 },
            { label: "Only DMs", value: 2 }
        ]
    }
});

const ReadButton = ({ children, onClick }: { children: React.ReactNode; onClick: () => void; }) => (
    <TextButton
        variant="secondary"
        onClick={onClick}
        className="vc-ranb-button"
    >
        {children}
    </TextButton>
);

const DMsIcon = ({ size = 14 }: { size?: number; }) => (
    <svg
        width={size}
        height={size}
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path d="M13 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M3 5v-.75C3 3.56 3.56 3 4.25 3s1.24.56 1.33 1.25C6.12 8.65 9.46 12 13 12h1a8 8 0 0 1 8 8 2 2 0 0 1-2 2 .21.21 0 0 1-.2-.15 7.65 7.65 0 0 0-1.32-2.3c-.15-.2-.42-.06-.39.17l.25 2c.02.15-.1.28-.25.28H9a2 2 0 0 1-2-2v-2.22c0-1.57-.67-3.05-1.53-4.37A15.85 15.85 0 0 1 3 5Z" />
    </svg>
);

const GuildsIcon = ({ size = 14 }: { size?: number; }) => (
    <svg
        width={size}
        height={size}
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path d="M19.73 4.87a18.2 18.2 0 0 0-4.6-1.44c-.21.4-.4.8-.58 1.21-1.69-.25-3.4-.25-5.1 0-.18-.41-.37-.82-.59-1.2-1.6.27-3.14.75-4.6 1.43A19.04 19.04 0 0 0 .96 17.7a18.43 18.43 0 0 0 5.63 2.87c.46-.62.86-1.28 1.2-1.98-.65-.25-1.29-.55-1.9-.92.17-.12.32-.24.47-.37 3.58 1.7 7.7 1.7 11.28 0l.46.37c-.6.36-1.25.67-1.9.92.35.7.75 1.35 1.2 1.98 2.03-.63 3.94-1.6 5.64-2.87.47-4.87-.78-9.09-3.3-12.83ZM8.3 15.12c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26s2.02 1.02 2 2.26c0 1.25-.89 2.27-2 2.27Zm7.4 0c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26s2.02 1.02 2 2.26c0 1.25-.88 2.27-2 2.27Z" />
    </svg>
);

export default definePlugin({
    name: "ReadAllNotificationsButton",
    description: "Read all server or direct message notifications with a single button click!",
    tags: ["Notifications", "Shortcuts"],
    authors: [Devs.kemo, Devs.tekken],
    dependencies: ["ServerListAPI"],
    settings,

    renderReadButtons: ErrorBoundary.wrap(() => {
        const mode = settings.store.visibleButtons;

        return (
            <div>
                <BaseText size="sm" className="vc-ranb-text">
                    Read All
                </BaseText>

                {(mode === 0 || mode === 1) && (
                    <ReadButton onClick={onClickGuilds}>
                        <GuildsIcon />
                        Guilds
                    </ReadButton>
                )}

                {(mode === 0 || mode === 2) && (
                    <ReadButton onClick={onClickDMs}>
                        <DMsIcon />
                        DMs
                    </ReadButton>
                )}
            </div>
        );
    }, { noop: true }),

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderReadButtons);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderReadButtons);
    }
});
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { extractAndLoadChunksLazy, filters, findByCodeLazy, findComponentByCodeLazy, mapMangledModuleLazy } from "@webpack";
import { ChannelStore, ContextMenuApi, Popout, SelectedChannelStore } from "@webpack/common";
import { Guild, User } from "discord-types/general";


// from AccountPanelServerProfile
const UserProfile = findComponentByCodeLazy("UserProfilePopoutWrapper: user cannot be undefined");
const preloadUser = findByCodeLazy("preloadUserBanner");

const { UserContext } = mapMangledModuleLazy('navId:"user-context"', {
    UserContext: filters.byCode("children:")
});
const { GuildContext } = mapMangledModuleLazy('navId:"guild-context"', {
    GuildContext: filters.byCode("children:")
});

const requireUserContextMenu = extractAndLoadChunksLazy([".userIds.length>0).reverse("]);
const requireGuildContextMenu = extractAndLoadChunksLazy(['action:"PRESS_MUTUAL_GUILD"']);

let shiftPressed = false;
const keydown = (e: KeyboardEvent) => e.key === "Shift" && (shiftPressed = true);
const keyup = (e: KeyboardEvent) => e.key === "Shift" && (shiftPressed = false);

const settings = definePluginSettings({
    ReverseShift: {
        description: "Reverse the shift key behavior",
        type: OptionType.BOOLEAN,
        default: false,
    },
});

interface GuildProps {
    guild: Guild;
    nick: string | null;
    user: User;
    theme: string;
    onSelect: Function;
    position: "left" | "right";
    Original: React.ComponentType<any>;
}


export default definePlugin({
    name: "OpenMemberPopoutInstead",
    authors: [Devs.Joona],
    description: "Clicking on a mutual server opens the member popout or context menu instead of navigating to the server or showing its context menu.",
    patches: [
        {
            find: 'action:"PRESS_MUTUAL_GUILD"',
            replacement: [
                {
                    match: /return\(0,\i\.jsxs?\)\((\i),({.+?}),\i\.id\)/,
                    replace: "return $self.renderGuild({Original: $1, position: 'right', ...$2})"
                },
                {
                    match: /onClick:\i,onContextMenu:.+?children:/,
                    replace: "children:"
                }
            ]
        },
        {
            find: 'section:"MUTUAL_FRIENDS"',
            replacement: {
                match: /return\(0,\i\.jsxs?\)\((\i\.\i),({.+?}),\i\.id\)/,
                replace: "return $self.renderGuild({Original: $1, position: 'left', ...$2})"
            }
        }
    ],
    settings,

    start() {
        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);
    },

    stop() {
        document.removeEventListener("keydown", keydown);
        document.removeEventListener("keyup", keyup);
    },

    renderGuild({ guild, nick, user, theme, onSelect, position, Original }: GuildProps) {
        return (
            <ErrorBoundary fallback={Original}>
                <Popout
                    key={guild.id}
                    renderPopout={() => (
                        <UserProfile
                            userId={user.id}
                            guildId={guild.id}
                        />
                    )}
                    position={position}
                    align="center"
                    preload={() =>
                        preloadUser(user.id, user.getAvatarURL(guild.id, 80), { guildId: guild.id })
                    }
                >
                    {props => (
                        <div
                            {...props}
                            onClick={e => {
                                (shiftPressed !== settings.store.ReverseShift) ? onSelect() : props.onClick(e);
                            }}
                            onContextMenu={e => {
                                if (shiftPressed !== settings.store.ReverseShift) {
                                    ContextMenuApi.openContextMenuLazy(e, async () => {
                                        await requireGuildContextMenu();

                                        return props => (
                                            <GuildContext
                                                {...props}
                                                guild={guild}
                                            />);
                                    });
                                    return;
                                }

                                ContextMenuApi.openContextMenuLazy(e, async () => {
                                    await requireUserContextMenu();

                                    return props => (
                                        <div className="vc-ompi-menu">
                                            <UserContext
                                                {...props}
                                                user={user}
                                                guildId={guild.id}
                                                channel={ChannelStore.getChannel(SelectedChannelStore.getChannelId())}
                                            />
                                        </div>
                                    );
                                });
                            }}
                        >
                            <Original
                                guild={guild}
                                nick={nick}
                                user={user}
                                theme={theme}
                            />
                        </div>
                    )}
                </Popout>
            </ErrorBoundary >
        );
    }
});

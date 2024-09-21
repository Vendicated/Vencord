/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { Popout } from "@webpack/common";
import { Guild, User } from "discord-types/general";


// from AccountPanelServerProfile
const UserProfile = findComponentByCodeLazy("UserProfilePopoutWrapper: user cannot be undefined");
const preloadUser = findByCodeLazy("preloadUserBanner");

let shiftPressed = false;
const keydown = (e: KeyboardEvent) => e.key === "Shift" && (shiftPressed = true);
const keyup = (e: KeyboardEvent) => e.key === "Shift" && (shiftPressed = false);

export default definePlugin({
    name: "ShowMeTheMember",
    authors: [Devs.Joona],
    description: "Open the member popout instead of navigating to the server",
    patches: [
        {
            find: ".Messages.NO_MUTUAL_GUILDS})]",
            replacement: {
                match: /return\(0,\i\.jsxs?\)\((\i),({.+?}),\i\.id\)(?<=\.NO_MUTUAL_GUILDS.{1,200})/,
                replace: "return $self.renderGuild({Original: $1, ...$2})"
            },
        }
    ],
    start() {
        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);
    },
    stop() {
        document.removeEventListener("keydown", keydown);
        document.removeEventListener("keyup", keyup);
    },
    renderGuild({ guild, nick, user, theme, onSelect, Original }: { guild: Guild, nick: string | null, user: User, theme: string, onSelect: Function, Original: React.ComponentType<any>; }) {
        return (
            <ErrorBoundary>
                <Popout
                    key={guild.id}
                    renderPopout={() => (
                        <UserProfile
                            userId={user.id}
                            guildId={guild.id}
                        />
                    )}
                    position="top"
                    align="right"
                    preload={() =>
                        preloadUser(user.id, user.getAvatarURL(guild.id, 80), { guildId: guild.id })
                    }
                >
                    {props => (
                        <div
                            {...props}
                            onClick={e => shiftPressed ? onSelect() : props.onClick(e)}
                        >
                            <Original
                                guild={guild}
                                nick={nick}
                                user={user}
                                theme={theme}
                            />
                        </div>
                    )}
                </ Popout>
            </ErrorBoundary >
        );
    }
});

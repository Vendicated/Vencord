/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import ErrorBoundary from "@components/ErrorBoundary";
import { LazyComponent } from "@utils/react";
import { find, findByPropsLazy } from "@webpack";
import { React, useStateFromStores } from "@webpack/common";

import { ExpandedGuildFolderStore, settings } from ".";

const Animations = findByPropsLazy("a", "animated", "useTransition");
const GuildsBar = LazyComponent(() => find(m => m.type?.toString().includes('("guildsnav")')));

export default ErrorBoundary.wrap(guildsBarProps => {
    const expandedFolders = useStateFromStores([ExpandedGuildFolderStore], () => ExpandedGuildFolderStore.getExpandedFolders());

    const Sidebar = (
        <GuildsBar
            {...guildsBarProps}
            isBetterFolders={true}
            betterFoldersExpandedIds={expandedFolders}
        />
    );

    const visible = !!expandedFolders.size;
    const guilds = document.querySelector(guildsBarProps.className.split(" ").map(c => `.${c}`).join(""));

    if (!guilds || !settings.store.sidebarAnim) {
        return visible
            ? <div style={{ display: "flex " }}>{Sidebar}</div>
            : null;
    }

    return (
        <Animations.Transition
            items={visible}
            from={{ width: 0 }}
            enter={{ width: guilds.getBoundingClientRect().width }}
            leave={{ width: 0 }}
            config={{ duration: 200 }}
        >
            {(style, show) =>
                show && (
                    <Animations.animated.div style={{ ...style, display: "flex" }}>
                        {Sidebar}
                    </Animations.animated.div>
                )
            }
        </Animations.Transition>
    );
}, { noop: true });

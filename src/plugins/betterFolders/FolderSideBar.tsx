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
import { findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Animations, useStateFromStores } from "@webpack/common";
import type { CSSProperties } from "react";

import { ExpandedGuildFolderStore, settings } from ".";

const ChannelRTCStore = findStoreLazy("ChannelRTCStore");
const GuildsBar = findComponentByCodeLazy('("guildsnav")');

export default ErrorBoundary.wrap(guildsBarProps => {
    const expandedFolders = useStateFromStores([ExpandedGuildFolderStore], () => ExpandedGuildFolderStore.getExpandedFolders());
    const isFullscreen = useStateFromStores([ChannelRTCStore], () => ChannelRTCStore.isFullscreenInContext());

    const Sidebar = (
        <GuildsBar
            {...guildsBarProps}
            isBetterFolders={true}
            betterFoldersExpandedIds={expandedFolders}
        />
    );

    const visible = !!expandedFolders.size;
    const guilds = document.querySelector(guildsBarProps.className.split(" ").map(c => `.${c}`).join(""));

    // We need to display none if we are in fullscreen. Yes this seems horrible doing with css, but it's literally how Discord does it.
    // Also display flex otherwise to fix scrolling.
    // gridArea is needed to align properly with the base app grid.
    const barStyle = {
        display: isFullscreen ? "none" : "flex",
        gridArea: "betterFoldersSidebar"
    } satisfies CSSProperties;

    if (!guilds || !settings.store.sidebarAnim) {
        return visible
            ? <div style={barStyle}>{Sidebar}</div>
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
            {(animationStyle: any, show: any) =>
                show && (
                    <Animations.animated.div style={{ ...animationStyle, ...barStyle }}>
                        {Sidebar}
                    </Animations.animated.div>
                )
            }
        </Animations.Transition>
    );
}, { noop: true });

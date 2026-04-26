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
import { findComponentByCodeLazy } from "@webpack";
import { Animations, ChannelRTCStore, useStateFromStores } from "@webpack/common";
import type { CSSProperties } from "react";

import { ExpandedGuildFolderStore, getExpandedFolderIdSet, getParentFolderId, settings, SortedGuildStore } from ".";

const GuildsBar = findComponentByCodeLazy('("guildsnav")');

type GuildTreeNode = {
    id?: string | number;
    type?: string;
    children?: GuildTreeNode[];
};

function getExpandedFolderIds() {
    const expandedFolders = getExpandedFolderIdSet();
    const tree = SortedGuildStore.getGuildsTree();
    const expandedFolderIds = new Set<number>();
    const stack = [...(tree?.root?.children ?? [])];

    while (stack.length) {
        const node = stack.pop();
        if (!node) continue;

        if (node.type === "folder") {
            const folderId = node.id;
            if (folderId != null && expandedFolders.has(Number(folderId))) {
                expandedFolderIds.add(Number(folderId));
            }
        }

        if (node.children?.length) {
            stack.push(...node.children);
        }
    }

    return expandedFolderIds;
}

export default ErrorBoundary.wrap(guildsBarProps => {
    const expandedFolderIds = useStateFromStores([ExpandedGuildFolderStore, SortedGuildStore], () => getExpandedFolderIds());
    const isFullscreen = useStateFromStores([ChannelRTCStore], () => ChannelRTCStore.isFullscreenInContext());

    const Sidebar = (
        <GuildsBar
            {...guildsBarProps}
            isBetterFolders={true}
            betterFoldersExpandedIds={expandedFolderIds}
        />
    );

    const visible = SortedGuildStore.getGuildFolders().some(folder =>
        folder.guildIds?.length &&
        expandedFolderIds.has(Number(folder.folderId)) &&
        getParentFolderId(folder.folderId) == null
    );
    const guilds = document.querySelector(guildsBarProps.className.split(" ").map(c => `.${c}`).join(""));

    // We need to display none if we are in fullscreen. Yes this seems horrible doing with css, but it's literally how Discord does it.
    // Also display flex otherwise to fix scrolling.
    const sidebarStyle = {
        display: isFullscreen ? "none" : "flex"
    } satisfies CSSProperties;

    if (!guilds || !settings.store.sidebarAnim) {
        return visible
            ? <div className="vc-betterFolders-sidebar" style={sidebarStyle}>{Sidebar}</div>
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
                    <Animations.animated.div className="vc-betterFolders-sidebar" style={{ ...animationStyle, ...sidebarStyle }}>
                        {Sidebar}
                    </Animations.animated.div>
                )
            }
        </Animations.Transition>
    );
}, { noop: true });

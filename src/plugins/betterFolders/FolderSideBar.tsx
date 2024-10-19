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
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { useStateFromStores } from "@webpack/common";
import type { CSSProperties } from "react";

import { ExpandedGuildFolderStore, settings, SortedGuildStore, NestMode } from ".";

const ChannelRTCStore = findStoreLazy("ChannelRTCStore");
const Animations = findByPropsLazy("a", "animated", "useTransition");
const GuildsBar = findComponentByCodeLazy('("guildsnav")');

function generateSidebar(guildsBarProps, expandedFolders, id: number) {
    return (
        <GuildsBar
            {...guildsBarProps}
            betterFoldersId={id}
            betterFoldersExpandedIds={new Set(expandedFolders)}
        />
    );
}

export default ErrorBoundary.wrap(guildsBarProps => {
    const expandedFolders = useStateFromStores([ExpandedGuildFolderStore], () => ExpandedGuildFolderStore.getExpandedFolders());
    const isFullscreen = useStateFromStores([ChannelRTCStore], () => ChannelRTCStore.isFullscreenInContext());


    let Sidebars;
    switch (settings.store.nestMode) {
        case NestMode.DISABLED:
            Sidebars = generateSidebar(guildsBarProps, expandedFolders, 1);
            break;
        case NestMode.SEPERATE_COLUMNS:
            Sidebars = Array.from(expandedFolders).map(e => generateSidebar(guildsBarProps, [e], e as number));
            break;
        case NestMode.NESTED:
            const allFolders = SortedGuildStore.getGuildFolders();
            Sidebars = Array.from(expandedFolders).map(e => {
                const current = allFolders.filter(it => it.folderId == e)[0];
                const folders: any[] = !current ? [] : allFolders.filter(it => {
                    if (!it.folderName?.startsWith(`${current.folderName}/`)) return false;
                    const subName = it.folderName.substring(current.folderName.length + 1);
                    if (subName.includes("/")) {
                        // check if parent actually exists.
                        const parentName = `${current.folderName}/${subName.substring(0, subName.indexOf("/"))}`;
                        return !allFolders.find(f => f.folderName == parentName);
                    } else {
                        return true;
                    }
                }).map(it => it.folderId);
                folders.push(e);
                return generateSidebar(guildsBarProps, folders, e as number);
            });
            break;
    }

    const visible = !!expandedFolders.size;
    const guilds = document.querySelector(guildsBarProps.className.split(" ").map(c => `.${c}`).join(""));

    // We need to display none if we are in fullscreen. Yes this seems horrible doing with css, but it's literally how Discord does it.
    // Also display flex otherwise to fix scrolling
    const barStyle = {
        display: isFullscreen ? "none" : "flex",
    } as CSSProperties;

    if (!guilds || !settings.store.sidebarAnim) {
        return visible
            ? <div style={barStyle}>{Sidebars}</div>
            : null;
    }

    const animStyle = {
        width: guilds.getBoundingClientRect().width * Sidebars.length,
        transition: "width .2s ease-out"
    } as CSSProperties;

    return (
        <div style={{ ...animStyle, ...barStyle }}>
            {Sidebars}
        </div>
    );
}, { noop: true });

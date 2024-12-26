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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher, useMemo } from "@webpack/common";

import FolderSideBar from "./FolderSideBar";

enum FolderIconDisplay {
    Never,
    Always,
    MoreThanOneFolderExpanded
}

export const ExpandedGuildFolderStore = findStoreLazy("ExpandedGuildFolderStore");
const SortedGuildStore = findStoreLazy("SortedGuildStore");
const GuildsTree = findLazy(m => m.prototype?.moveNextTo);
const FolderUtils = findByPropsLazy("move", "toggleGuildFolderExpand");

let lastGuildId = null as string | null;
let dispatchingFoldersClose = false;

function getGuildFolder(id: string) {
    return SortedGuildStore.getGuildFolders().find(folder => folder.guildIds.includes(id));
}

function closeFolders() {
    for (const id of ExpandedGuildFolderStore.getExpandedFolders())
        FolderUtils.toggleGuildFolderExpand(id);
}

export const settings = definePluginSettings({
    sidebar: {
        type: OptionType.BOOLEAN,
        description: "Display servers from folder on dedicated sidebar",
        restartNeeded: true,
        default: true
    },
    sidebarAnim: {
        type: OptionType.BOOLEAN,
        description: "Animate opening the folder sidebar",
        default: true
    },
    closeAllFolders: {
        type: OptionType.BOOLEAN,
        description: "Close all folders when selecting a server not in a folder",
        default: false
    },
    closeAllHomeButton: {
        type: OptionType.BOOLEAN,
        description: "Close all folders when clicking on the home button",
        restartNeeded: true,
        default: false
    },
    closeOthers: {
        type: OptionType.BOOLEAN,
        description: "Close other folders when opening a folder",
        default: false
    },
    forceOpen: {
        type: OptionType.BOOLEAN,
        description: "Force a folder to open when switching to a server of that folder",
        default: false
    },
    keepIcons: {
        type: OptionType.BOOLEAN,
        description: "Keep showing guild icons in the primary guild bar folder when it's open in the BetterFolders sidebar",
        restartNeeded: true,
        default: false
    },
    showFolderIcon: {
        type: OptionType.SELECT,
        description: "Show the folder icon above the folder guilds in the BetterFolders sidebar",
        options: [
            { label: "Never", value: FolderIconDisplay.Never },
            { label: "Always", value: FolderIconDisplay.Always, default: true },
            { label: "When more than one folder is expanded", value: FolderIconDisplay.MoreThanOneFolderExpanded }
        ],
        restartNeeded: true
    }
});

export default definePlugin({
    name: "BetterFolders",
    description: "Shows server folders on dedicated sidebar and adds folder related improvements",
    authors: [Devs.juby, Devs.AutumnVN, Devs.Nuckyz],

    settings,

    patches: [
        {
            find: "hideNote:",
            all: true,
            // Some modules match the find but the replacement is returned untouched
            noWarn: true,
            predicate: () => settings.store.hide,
            replacement: {
                match: /hideNote:.+?(?=([,}].*?\)))/g,
                replace: (m, rest) => {
                    const destructuringMatch = rest.match(/}=.+/);
                    if (destructuringMatch) {
                        const defaultValueMatch = m.match(canonicalizeMatch(/hideNote:(\i)=!?\d/));
                        return defaultValueMatch ? `hideNote:${defaultValueMatch[1]}=!0` : m;
                    }

                    return "hideNote:!0";
                }
            }
        },
        {
            find: "#{intl::NOTE_PLACEHOLDER}",
            replacement: {
                match: /#{intl::NOTE_PLACEHOLDER}\),/,
                replace: "$&spellCheck:!$self.noSpellCheck,"
            }
        }
    ],

    flux: {
        CHANNEL_SELECT(data) {
            if (!settings.store.closeAllFolders && !settings.store.forceOpen)
                return;

            if (lastGuildId !== data.guildId) {
                lastGuildId = data.guildId;
                const guildFolder = getGuildFolder(data.guildId);

                if (guildFolder?.folderId) {
              

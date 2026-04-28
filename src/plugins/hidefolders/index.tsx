/*
 * Vencord, a Discord client mod
 * HideFolders - إخفاء الفولدرات فقط
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import {
    findGroupChildrenByChildId,
    NavContextMenuPatchCallback,
} from "@api/ContextMenu";
import {
    addServerListElement,
    removeServerListElement,
    ServerListRenderPosition,
} from "@api/ServerList";
import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import { findStoreLazy } from "@webpack";
import { Menu, React, useStateFromStores } from "@webpack/common";

import { addIndicator, removeIndicator } from "./indicator";
import settings from "./settings";
import { HiddenFoldersStore } from "./store";

type GuildsNode = {
    type: "guild" | "folder";
    id: number | string;
    children: GuildsNode[];
};

type QsResult = {
    type: "GUILD" | string;
    record?: {
        id?: string;
        guild_id?: string;
    };
};

export const SortedGuildStore = findStoreLazy("SortedGuildStore");

const Patch: NavContextMenuPatchCallback = (children, props: any) => {
    if (!("folderId" in props)) return;

    const group = findGroupChildrenByChildId("privacy", children);
    if (!group) return;

    const { folderId } = props;
    const isHidden = HiddenFoldersStore.hiddenFolders.has("folder-" + folderId);

    group.push(
        <Menu.MenuItem
            id="vc-hide-folder"
            label={isHidden ? "Unhide Folder" : "Hide Folder"}
            action={() => {
                if (isHidden) {
                    HiddenFoldersStore.removeHiddenFolder(folderId.toString());
                } else {
                    HiddenFoldersStore.addHiddenFolder(folderId.toString());
                }
            }}
        />
    );
};

export default definePlugin({
    name: "HideFolders",
    description: "Hide guild folders from the server list and quick switcher by right-clicking them",
    authors: [Devs.rz30],
    tags: ["guild", "server", "hide", "folder"],

    dependencies: ["ServerListAPI"],
    contextMenus: {
        "guild-context": Patch,
        "guild-header-popout": Patch,
    },
    patches: [
        {
            find: '("guildsnav")',
            replacement: [
                {
                    match: /(\i)(\.map\(.{0,30}\}\),\i)/,
                    replace: "$self.useFilteredGuilds($1)$2",
                },
                {
                    match: /let{disableAppDownload.{0,10}isPlatformEmbedded/,
                    replace: "$self.useStore();$&",
                },
            ],
        },
        {
            find: "#{intl::QUICKSWITCHER_PROTIP}",
            replacement: {
                match: /(?<=renderResults\(\){.{0,100})let{query/,
                replace: "this.props.results = $self.filteredGuildResults(this.props.results);$&",
            },
        },
    ],
    settings,

    useStore: () => {
        useStateFromStores(
            [HiddenFoldersStore],
            () => HiddenFoldersStore.hiddenFolders,
            undefined,
            (old, newer) => old.size === newer.size
        );
    },

    async start() {
        if (settings.store.showIndicator) {
            addIndicator();
        }
        await HiddenFoldersStore.load();
    },

    async stop() {
        removeIndicator();
        HiddenFoldersStore.unload();
    },

    useFilteredGuilds(guilds: GuildsNode[]): GuildsNode[] {
        const hiddenFolders = useStateFromStores(
            [HiddenFoldersStore],
            () => HiddenFoldersStore.hiddenFolders,
            undefined,
            (old, newer) => old.size === newer.size
        );

        return guilds.flatMap(guild => {
            if (!(hiddenFolders instanceof Set)) return [guild];

            if (guild.type === "folder" && hiddenFolders.has("folder-" + guild.id.toString())) {
                return [];
            }

            return [guild];
        });
    },

    filteredGuildResults(results: QsResult[]): QsResult[] {
        const { hiddenFolders } = HiddenFoldersStore;

        const folders = SortedGuildStore.getGuildFolders().filter((f: any) =>
            hiddenFolders.has("folder-" + f.folderId)
        );

        const hiddenGuildIds = new Set<string>();
        folders.forEach((f: any) => {
            (f.guildIds as string[]).forEach((id: string) => hiddenGuildIds.add(id));
        });

        return results.filter(result => {
            if (result?.record?.guild_id && hiddenGuildIds.has(result.record.guild_id)) {
                return false;
            }
            if (result.type === "GUILD" && result.record?.id && hiddenGuildIds.has(result.record.id)) {
                return false;
            }
            return true;
        });
    },
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// additional thanks to mwittrien/DevilBro and nexpid for their server hiding plugins, which served as inspiration

import {
    findGroupChildrenByChildId,
    NavContextMenuPatchCallback,
} from "@api/ContextMenu";
import {
    addServerListElement,
    removeServerListElement,
    ServerListRenderPosition,
} from "@api/ServerList";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Guild } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { Menu, React, useStateFromStores } from "@webpack/common";

import hiddenServersButton from "./components/HiddenServersButton";
import { HiddenServersStore } from "./HiddenServersStore";
import settings from "./settings";

type guildsNode = {
    type: "guild" | "folder";
    id: number | string;
    children: guildsNode[];
};

type qsResult = {
    type: "GUILD" | string;
    record?: {
        id?: string;
        guild_id?: string;
    };
};

export const SortedGuildStore = findStoreLazy("SortedGuildStore");

const Patch: NavContextMenuPatchCallback = (
    children,
    { guild }: { guild: Guild; }
) => {
    const group = findGroupChildrenByChildId("privacy", children);
    if (!group) return;

    const isHidden = HiddenServersStore.hiddenGuilds.has(guild.id.toString());

    group.push(
        <Menu.MenuItem
            id="vc-hide-server"
            label={isHidden ? "Unhide Server" : "Hide Server"}
            action={() => {
                if (isHidden) {
                    HiddenServersStore.removeHiddenGuild(guild.id);
                } else {
                    HiddenServersStore.addHiddenGuild(guild.id);
                }
            }}
        />
    );
};

export function addIndicator() {
    addServerListElement(ServerListRenderPosition.Below, hiddenServersButton);
}

export function removeIndicator() {
    removeServerListElement(ServerListRenderPosition.Below, hiddenServersButton);
}

export default definePlugin({
    name: "HideServers",
    description: "Allows you to hide servers from the guild list and quick switcher by right clicking them",
    authors: [EquicordDevs.bep],
    tags: ["guild", "server", "hide", "folder"],

    dependencies: ["ServerListAPI"],
    contextMenus: {
        "guild-header-popout": Patch,
        "guild-context": (menuItems, props: any) => {
            if ("guild" in props) {
                Patch(menuItems, props);
            }

            if ("folderId" in props) {
                const { folderId } = props;
                const folder = SortedGuildStore.getGuildFolderById(folderId);
                const { guildIds } = folder;
                const isHidden = guildIds.every(id => HiddenServersStore.hiddenGuilds.has(id));

                menuItems.push(
                    <Menu.MenuItem
                        id="vc-hide-folder"
                        label={isHidden ? "Unhide Folder" : "Hide Folder"}
                        action={() => {
                            if (isHidden) {
                                HiddenServersStore.removeHiddenFolder(folderId, guildIds);
                            } else {
                                HiddenServersStore.addHiddenFolder(folderId, guildIds);
                            }
                        }}
                    />
                );
            }
        },
    },
    patches: [
        {
            find: '("guildsnav")',
            replacement: [
                {
                    match: /(\i)(\.map\(.{0,30}\}\),\i)/,
                    replace: "$self.useFilteredGuilds($1)$2"
                },
                {
                    match: /let{disableAppDownload.{0,10}isPlatformEmbedded/,
                    replace: "$self.useStore();$&",
                }
            ]
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
    useStore: () => { useStateFromStores([HiddenServersStore], () => HiddenServersStore.hiddenGuilds, undefined, (old, newer) => old.size === newer.size); },

    async start() {
        if (settings.store.showIndicator) {
            addIndicator();
        }
        await HiddenServersStore.load();
    },

    async stop() {
        removeIndicator();
        HiddenServersStore.unload();
    },

    useFilteredGuilds(guilds: guildsNode[]): guildsNode[] {
        const hiddenGuilds = useStateFromStores(
            [HiddenServersStore],
            () => HiddenServersStore.hiddenGuilds,
            undefined,
            (old, newer) => old.size === newer.size
        );

        return guilds.flatMap(guild => {
            if (!(hiddenGuilds instanceof Set)) return [guild];
            if (guild.type === "guild" && hiddenGuilds.has(guild.id.toString())) {
                return [];
            }

            if (guild.type === "folder" && hiddenGuilds.has("folder-" + guild.id.toString())) {
                return [];
            }

            const newGuild = Object.assign({}, guild);
            newGuild.children = guild.children.filter(
                child =>
                    !hiddenGuilds.has(child.id.toString()) &&
                    !(child.type === "folder" && hiddenGuilds.has("folder-" + child.id.toString()))
            );

            return [newGuild];
        });
    },

    filteredGuildResults(results: qsResult[]): qsResult[] {
        const { hiddenGuilds } = HiddenServersStore;
        return results.filter(result => {
            if (result?.record?.guild_id && hiddenGuilds.has(result.record.guild_id)) {
                return false;
            }
            if (result.type === "GUILD" && hiddenGuilds.has(result.record!.id!)) {
                return false;
            }
            return true;
        });
    },
});

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

const Patch: NavContextMenuPatchCallback = (
    children,
    { guild }: { guild: Guild; }
) => {
    const group = findGroupChildrenByChildId("privacy", children);

    group?.push(
        <Menu.MenuItem
            id="vc-hide-server"
            label="Hide Server"
            action={() => HiddenServersStore.addHidden(guild)}
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
    tags: ["guild", "server", "hide"],

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
                    replace: "$self.useFilteredGuilds($1)$2"
                },
                // despite my best efforts, the above doesnt trigger a rerender
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
        const hiddenGuilds = useStateFromStores([HiddenServersStore], () => HiddenServersStore.hiddenGuilds, undefined, (old, newer) => old.size === newer.size);
        return guilds.flatMap(guild => {
            if (!(hiddenGuilds instanceof Set)) return [guild];
            if (hiddenGuilds.has(guild.id.toString())) {
                return [];
            }
            const newGuild = Object.assign({}, guild);
            newGuild.children = guild.children.filter(
                child => !hiddenGuilds.has(child.id.toString())
            );

            return [newGuild];
        });
    },

    filteredGuildResults(results: qsResult[]): qsResult[] {
        // not used in a component so no useStateFromStore
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

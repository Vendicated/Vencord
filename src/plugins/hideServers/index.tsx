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
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { GuildStore, Menu, React } from "@webpack/common";
import { Guild } from "discord-types/general";

import HiddenServersButton from "./components/HiddenServersButton";
import openHiddenServersModal from "./components/modal";
import { addHidden, hiddenGuilds, hiddenGuildsDetail, loadHidden, settings } from "./settings";

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

let rerenderRef: undefined | WeakRef<Function>;
export function rerender() {
    const ref = rerenderRef?.deref();
    if (ref) {
        ref();
    }
}

const Patch: NavContextMenuPatchCallback = (
    children,
    { guild }: { guild: Guild; }
) => {
    const group = findGroupChildrenByChildId("privacy", children);

    group?.push(
        <Menu.MenuItem
            id="vc-hide-server"
            label="Hide Server"
            action={() => addHidden(guild)}
        />
    );
};

function serverListFunction() {
    // if youve left a server dont show it in the count
    const actuallyHidden = Array.from(hiddenGuilds).filter(x => GuildStore.getGuild(x)).length;
    return <HiddenServersButton
        count={actuallyHidden}
        onClick={() => openHiddenServersModal({ servers: hiddenGuildsDetail() })}
    ></HiddenServersButton>;
}


export function addIndicator() {
    addServerListElement(ServerListRenderPosition.Below, serverListFunction);
}

export function removeIndicator() {
    removeServerListElement(ServerListRenderPosition.Below, serverListFunction);
}

export default definePlugin({
    name: "HideServers",
    description:
        "Allows you to hide servers from the guild list and quick switcher by right clicking them",
    authors: [Devs.bep],
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
                    match: /(?<=Messages\.SERVERS.+?)(\i)(\.map.{0,50}?case \i\.GuildsNodeType\.FOLDER)/,
                    replace: "$1.flatMap($self.filterGuilds)$2",
                },
                {
                    match: /let{disableAppDownload.{0,10}isPlatformEmbedded/,
                    replace:
                        "$self.grabRerender(Vencord.Webpack.Common.React.useReducer(x => x+1,0));$&",
                },
            ],
        },
        {
            find: "QUICKSWITCHER_PROTIP.format",
            replacement: {
                match: /(?<=renderResults\(\){)let{query/,
                replace:
                    "this.props.results = $self.filterResults(this.props.results);$&",
            },
        },
    ],
    settings,

    async start() {
        if (settings.store.showManager) {
            addIndicator();
        }
        await loadHidden();
    },

    async stop() {
        removeIndicator();
        hiddenGuilds.clear();
    },

    filterGuilds(guild: guildsNode): guildsNode[] {
        if (hiddenGuilds.has(guild.id.toString())) {
            return [];
        }
        const newGuild = Object.assign({}, guild);
        newGuild.children = guild.children.filter(
            child => !hiddenGuilds.has(child.id.toString())
        );

        return [newGuild];
    },

    grabRerender([, e]: [unknown, Function]) {
        rerenderRef = new WeakRef(e);
    },

    filterResults(results: qsResult[]): qsResult[] {
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

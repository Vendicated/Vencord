/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, Menu } from "@webpack/common";

import { settings } from "./settings";

const SortedGuildStore = findStoreLazy("SortedGuildStore");

const Patch: NavContextMenuPatchCallback = (children, { guild }) => {
    const group = findGroupChildrenByChildId("privacy", children);

    if (!group) {
        return;
    }

    const isHidden = settings.store.hiddenGuilds.includes(guild.id);

    group.push(
        <Menu.MenuItem
            id="vc-hide-server"
            label={isHidden ? "Unhide Server" : "Hide Server"}
            action={() => {
                if (isHidden) {
                    settings.store.hiddenGuilds = settings.store.hiddenGuilds.filter(id => id !== guild.id);
                } else {
                    settings.store.hiddenGuilds = [...settings.store.hiddenGuilds, guild.id];
                }

                settings.store._toggleReveal = false;
                SortedGuildStore.emitChange();
                void FluxDispatcher.dispatch({ type: "LAYER_POP_ALL" });
            }}
        />
    );
};

export default definePlugin({
    name: "HideServers",
    description: "Provides the ability to hide servers from your server list",
    authors: [{
        id: 497029288822833163n,
        name: "omnifaced"
    }],

    settings,

    contextMenus: {
        "guild-context": Patch,
        "guild-header-popout": Patch
    },

    patches: [
        {
            find: "SortedGuildStore",
            replacement: {
                match: /getGuildsTree\(\){return (.+?)}/,
                replace: "getGuildsTree(){return $self.filterGuildsTree($1)}"
            }
        },
        {
            find: "SortedGuildStore",
            replacement: {
                match: /getFlattenedGuildIds\(\){return (.+?)}/,
                replace: "getFlattenedGuildIds(){return $self.filterFlattenedGuildIds($1)}"
            }
        }
    ],

    filterGuildsTree(tree: any) {
        if (!tree) {
            return tree;
        }

        try {
            if (settings.store._toggleReveal) {
                return tree;
            }

            const hidden = settings.store.hiddenGuilds;
            if (!hidden.length) {
                return tree;
            }

            const newNodes = {};
            for (const [id, node] of Object.entries(tree.nodes)) {
                if (!hidden.includes(id)) {
                    newNodes[id] = node;
                }
            }

            const filterChildren = (children: any[]) => {
                return children.filter(child => {
                    if (child.type === "folder") {
                        child.children = filterChildren(child.children);
                        return child.children.length > 0;
                    }
                    return !hidden.includes(child.id);
                });
            };

            const newRoot = {
                ...tree.root,
                children: filterChildren([...tree.root.children])
            };

            const newTree = Object.create(Object.getPrototypeOf(tree));
            Object.assign(newTree, {
                nodes: newNodes,
                root: newRoot,
                version: tree.version + 1
            });

            return newTree;
        } catch {
            return tree;
        }
    },

    filterFlattenedGuildIds(ids: any[]) {
        try {
            if (settings.store._toggleReveal) {
                return ids;
            }

            const hidden = settings.store.hiddenGuilds;
            if (!hidden.length) {
                return ids;
            }

            return ids.filter(id => !hidden.includes(id));
        } catch {
            return ids;
        }
    },

    addHideButton(props: any) {
        const guildId = props.guild?.id;
        if (!guildId) {
            return null;
        }

        if (settings.store.hiddenGuilds.includes(guildId)) {
            return null;
        }

        return (
            <Menu.MenuItem
                id="hide-server"
                label="Hide Server"
                action={() => {
                    settings.store.hiddenGuilds.push(guildId);
                    this.refresh();
                }}
            />
        );
    },

    refresh() {
        void FluxDispatcher.dispatch({ type: "GUILD_SETTINGS_UPDATE", guildId: "0" });
    },

    start() {
        this._keydownListener = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.code === "KeyH" && !settings.store._toggleReveal) {
                settings.store._toggleReveal = true;
                SortedGuildStore.emitChange();
            }
        };

        this._keyupListener = (e: KeyboardEvent) => {
            if ((!e.ctrlKey || e.code === "KeyH") && settings.store._toggleReveal) {
                settings.store._toggleReveal = false;
                SortedGuildStore.emitChange();
            }
        };

        window.addEventListener("keydown", this._keydownListener);
        window.addEventListener("keyup", this._keyupListener);
    },

    stop() {
        window.removeEventListener("keydown", this._keydownListener);
        window.removeEventListener("keyup", this._keyupListener);

        settings.store._toggleReveal = false;
    }
});

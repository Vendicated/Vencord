/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { CSSFileIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, Toasts } from "@webpack/common";
import { Message } from "discord-types/general";
import type { ReactNode } from "react";

interface Snippet { snippetId: string; snippet: string; }

const enum AddStrategy {
	Replace,
	Append,
	Prepend
}

const STORE_KEY = "quickCssSnippets";

let cachedSnippetIds = new Set<String>();

const generateSnippetId = (messageSnowflake: string, snippet: string): string => {
    const uniqueKey = `${messageSnowflake}-${snippet}`;
    let hash = 0;

    for (let i = 0; i < uniqueKey.length; i++) {
        const char = uniqueKey.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }

    return hash.toString();
};

const fetchSnippetIds = async () => {
    const storedSnippetIds = await DataStore.get(STORE_KEY);

    if (!storedSnippetIds) {
        cachedSnippetIds = new Set<String>();
        await DataStore.set(STORE_KEY, cachedSnippetIds);
    } else {
        cachedSnippetIds = storedSnippetIds;
    }
};

const saveSnippetIds = async () => {
    const storedSnippetIds = await DataStore.get(STORE_KEY) || new Set<String>();

    const mergedSnippetIds = new Set([...storedSnippetIds, ...cachedSnippetIds]);

    await DataStore.set(STORE_KEY, mergedSnippetIds);
};

const addToSnippetIdCache = (snippetId: string) => {
    cachedSnippetIds.add(snippetId);
};

const removeFromSnippetIdCache = (snippetId: string) => {
    cachedSnippetIds.delete(snippetId);
};

const importAllSnippets = async (snippets: Snippet[], strategy: AddStrategy) => {
    for (const { snippetId, snippet } of snippets) {
        await importCssSnippet(snippetId, snippet, strategy);
    }
};

const removeAllSnippets = async (snippetIds: string[]) => {
    for (const snippetId of snippetIds) {
        await removeCssSnippet(snippetId);
    }
};

const syncSnippetIds = async () => {
    const quickCSS = await VencordNative.quickCss.get();
    const snippetIds = await DataStore.get(STORE_KEY) as Set<string> || new Set<String>();

    const snippetIdsToRemove = [...snippetIds].filter((id: string) => !quickCSS.includes(id));

    if (snippetIdsToRemove.length > 0) {
        await DataStore.set(STORE_KEY, new Set([...snippetIds].filter((id: string) => !snippetIdsToRemove.includes(id))));
        await fetchSnippetIds();
    }
};

const removeCssSnippet = async (snippetId: string) => {
    let quickCss = await VencordNative.quickCss.get();

    const regex = new RegExp(
        String.raw`/\*\nsnippet ${snippetId}.*?/\* end snippet ${snippetId} \*/`,
        "gs"
    );

    quickCss = quickCss.replace(regex, "");
    await VencordNative.quickCss.set(quickCss);

    const snippets = await DataStore.get(STORE_KEY);
    await DataStore.update(STORE_KEY, snippets.filter((s: string) => s !== snippetId));

    removeFromSnippetIdCache(snippetId);

    Toasts.show({
        message: "Removed QuickCSS snippet!",
        type: Toasts.Type.SUCCESS,
        id: Toasts.genId(),
        options: {
            duration: 2000,
            position: Toasts.Position.BOTTOM,
        },
    });
};

const importCssSnippet = async (snippetId: string, snippet: string, strategy: AddStrategy) => {
    const quickCss = await VencordNative.quickCss.get();

    const existingCss = quickCss.trim();
    const cleanedSnippet = snippet.trim();

    let updatedCss: string;

    switch (strategy) {
        case AddStrategy.Replace:
            updatedCss = cleanedSnippet;
            break;
        case AddStrategy.Append:
            updatedCss = `${existingCss}\n\n${cleanedSnippet}`;
            break;
        case AddStrategy.Prepend:
            updatedCss = `${cleanedSnippet}\n\n${existingCss}`;
            break;
    }

    await VencordNative.quickCss.set(updatedCss);
    await DataStore.set(STORE_KEY, [...cachedSnippetIds, snippetId]);

    addToSnippetIdCache(snippetId);

    Toasts.show({
        message: "Imported QuickCSS snippet!",
        type: Toasts.Type.SUCCESS,
        id: Toasts.genId(),
        options: {
            duration: 2000,
            position: Toasts.Position.BOTTOM,
        },
    });
};

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message }) => () => {
    const { content, timestamp } = message;
    const re = /```css\n(.+?)```/gs;

    const hasCSSCodeblock = re.test(content);
    if (!hasCSSCodeblock) return;

    const { addStrategy } = settings.store;

    const items: ReactNode[] = [];
    const snippets: Snippet[] = [];

    let match: string[] | null;

    const snippetIds = cachedSnippetIds;
    const importableSnippets: Snippet[] = [];
    const removableSnippets: Snippet[] = [];

    while ((match = re.exec(content)) != null) {
        const snippetId = generateSnippetId(message.id, match[1]);
        const header = `/*\nsnippet ${snippetId} by ${message.author.username}, posted at ${new Date(timestamp as any).toLocaleString()}\n*/\n`;
        const footer = `/* end snippet ${snippetId} */`;

        const snippet = header + match[1] + footer;
        snippets.push({ snippetId, snippet });

        const isSnippetPresent = snippetIds.has(snippetId);

        let label = isSnippetPresent ? `Remove Snippet "${match[1].substring(0, 5)}` : `Import Snippet "${match[1].substring(0, 5)}`;
        if (match[1].length > 5) {
            label += "...";
        }
        label += '"';

        let menuItem: React.ReactNode;

        if (isSnippetPresent) {
            removableSnippets.push({ snippetId, snippet });
            menuItem = (
                <Menu.MenuItem
                    id={`vc-remove-snippet-${snippetId}`}
                    label={label}
                    icon={CSSFileIcon}
                    color="danger"
                    action={async () => await removeCssSnippet(snippetId)}
                />
            );
        } else {
            importableSnippets.push({ snippetId, snippet });
            menuItem = (
                <Menu.MenuItem
                    id={`vc-import-snippet-${snippetId}`}
                    label={label}
                    icon={CSSFileIcon}
                    action={async () => await importCssSnippet(snippetId, snippet, addStrategy)}
                />
            );
        }

        items.push(menuItem);
    }

    if (items.length === 0) return;

    if (items.length === 1) {
        const isSnippetPresent = snippetIds.has(snippets[0].snippetId);

        if (isSnippetPresent) {
            children.splice(-1, 0,
                <Menu.MenuItem
                    id={"vc-remove-snippet"}
                    label={"Remove QuickCSS Snippet"}
                    icon={CSSFileIcon}
                    color="danger"
                    action={async () => await removeCssSnippet(snippets[0].snippetId)}
                />);
        } else {
            children.splice(-1, 0,
                <Menu.MenuItem
                    id={"vc-import-snippet"}
                    label={"Import QuickCSS Snippet"}
                    icon={CSSFileIcon}
                    action={async () => await importCssSnippet(snippets[0].snippetId, snippets[0].snippet, addStrategy)}
                />);
        }
    }

    else {
        const allImportable = importableSnippets.length === snippets.length;
        const allRemovable = removableSnippets.length === snippets.length;

        if (snippets.length > 1 && (allImportable || allRemovable)) {
            const label = allImportable ? "Import All" : "Remove All";
            const action = allImportable
                ? async () => await importAllSnippets(importableSnippets, addStrategy)
                : async () => await removeAllSnippets(removableSnippets.map(s => s.snippetId));

            items.push(
                <Menu.MenuSeparator />,
                <Menu.MenuItem
                    id={`vc-${allImportable ? "import" : "remove"}-all-snippets`}
                    label={label}
                    icon={CSSFileIcon}
                    color={allImportable ? undefined : "danger"}
                    action={action}
                />
            );
        }

        children.splice(-1, 0,
            <Menu.MenuItem
                id="vc-css-snippets"
                label="QuickCSS Snippets">
                {items}
            </Menu.MenuItem>);
    }
};

const settings = definePluginSettings({
    addStrategy: {
        description: "How to add the QuickCSS snippets",
        type: OptionType.SELECT,
        options: [
            {
                label: "Replace",
                value: AddStrategy.Replace
            },
            {
                label: "Append",
                value: AddStrategy.Append,
                default: true
            },
            {
                label: "Prepend",
                value: AddStrategy.Prepend
            }
        ]
    }
});

export default definePlugin({
    name: "ManageQuickCSS",
    authors: [Devs.castdrian, Devs.Ven],
    description: "Allows you to import and remove QuickCSS snippets contained within messages",
    settings,
    cssListener: null as ReturnType<typeof VencordNative.quickCss.addChangeListener> | null,

    async start() {
        await fetchSnippetIds();
        addContextMenuPatch("message", messageContextMenuPatch);

        this.cssListener = VencordNative.quickCss.addChangeListener(async () => {
            await syncSnippetIds();
        });
    },

    async stop() {
        await saveSnippetIds();
        removeContextMenuPatch("message", messageContextMenuPatch);

        this.cssListener?.remove();
    },
});

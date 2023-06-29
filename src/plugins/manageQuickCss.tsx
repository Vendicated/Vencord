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
import { definePluginSettings, Settings } from "@api/Settings";
import { CSSFileIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, Toasts } from "@webpack/common";

const enum AddStrategy {
	Replace,
	Append,
	Prepend
}

const STORE_KEY = "quickCssSnippets";

let cachedSnippetIds: string[] = [];

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
    cachedSnippetIds = await DataStore.get(STORE_KEY) || [];
};

const saveSnippetIds = async () => {
    const storedSnippetIds = await DataStore.get(STORE_KEY) || [];
    const newSnippetIds = cachedSnippetIds.filter(id => !storedSnippetIds.includes(id));
    const updatedSnippetIds = [...storedSnippetIds, ...newSnippetIds];

    await DataStore.set(STORE_KEY, updatedSnippetIds);
};

const addToSnippetIdCache = (snippetId: string) => {
    if (!cachedSnippetIds.includes(snippetId)) {
        cachedSnippetIds.push(snippetId);
    }
};

const removeFromSnippetIdCache = (snippetId: string) => {
    cachedSnippetIds = cachedSnippetIds.filter(id => id !== snippetId);
};

const importAllSnippets = async (snowflake: string, snippets: { snippetId: string; snippet: string; }[], strategy: AddStrategy) => {
    for (const { snippetId, snippet } of snippets) {
        await importCssSnippet(snippetId, snippet, strategy);
    }
};

const removeAllSnippets = async (snippetIds: string[]) => {
    for (const snippetId of snippetIds) {
        await removeCssSnippet(snippetId);
    }
};

async function removeCssSnippet(snippetId: string) {
    let quickCss = await VencordNative.quickCss.get();

    const regex = new RegExp(
        String.raw`/\*\nsnippet ${snippetId}[^]*?/\* end snippet ${snippetId} \*/`,
        "gs"
    );

    quickCss = quickCss.replace(regex, "");
    await VencordNative.quickCss.set(quickCss);

    const snippets = await DataStore.get(STORE_KEY);
    await DataStore.set(STORE_KEY, snippets.filter((s: string) => s !== snippetId));

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
}

async function importCssSnippet(snippetId: string, snippet: string, strategy: AddStrategy) {
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
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    const { message } = props;
    const { content, timestamp } = message;

    const hasCSSCodeblock = content.includes("```css\n") && content.includes("\n```");
    if (!hasCSSCodeblock) return;

    const strategy = Settings.plugins.ManageQuickCSS.addStrategy;

    const items: any[] = [];
    const snippets: { snippetId: string; snippet: string; }[] = [];

    const re = /```css\n(.+?)```/gs;
    let match: string[] | null;

    const snippetIds = cachedSnippetIds;
    const importableSnippets: { snippetId: string; snippet: string; }[] = [];
    const removableSnippets: { snippetId: string; snippet: string; }[] = [];

    while ((match = re.exec(content)) != null) {
        const snippetId = generateSnippetId(message.id, match[1]);
        const header = `/*\nsnippet ${snippetId} by ${message.author.username}, posted at ${new Date(timestamp).toLocaleString()}\n*/\n`;
        const footer = `/* end snippet ${snippetId} */`;

        const snippet = header + match[1] + footer;
        snippets.push({ snippetId, snippet });

        const isSnippetPresent = snippetIds?.includes(snippetId) ?? false;

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
                    action={async () => await importCssSnippet(snippetId, snippet, strategy)}
                />
            );
        }

        items.push(menuItem);
    }

    if (items.length === 0) return;

    if (items.length === 1) {
        const isSnippetPresent = snippetIds?.includes(snippets[0].snippetId) ?? false;

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
                    action={async () => await importCssSnippet(snippets[0].snippetId, snippets[0].snippet, strategy)}
                />);
        }
    }

    else {
        const allImportable = importableSnippets.length === snippets.length;
        const allRemovable = removableSnippets.length === snippets.length;

        if (snippets.length > 1 && (allImportable || allRemovable)) {
            const label = allImportable ? "Import All" : "Remove All";
            const action = allImportable
                ? async () => await importAllSnippets(message.id, importableSnippets, strategy)
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

    toolboxActions: {
        async "Clear Saved Snippet IDs"() {
            await DataStore.set(STORE_KEY, []);
            await fetchSnippetIds();

            Toasts.show({
                message: "Cleared all saved QuickCSS snippet IDs!",
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId(),
                options: {
                    duration: 2000,
                    position: Toasts.Position.BOTTOM,
                },
            });
        }
    },

    async start() {
        await fetchSnippetIds();
        addContextMenuPatch("message", messageContextMenuPatch);
    },

    async stop() {
        await saveSnippetIds();
        removeContextMenuPatch("message", messageContextMenuPatch);
    },
});

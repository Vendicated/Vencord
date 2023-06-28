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

async function importCssSnippet(snippet: string, strategy: AddStrategy) {
    let quickCss = await VencordNative.quickCss.get();

    switch (strategy) {
        case AddStrategy.Replace:
            quickCss = snippet;
            break;
        case AddStrategy.Append:
            quickCss = quickCss + "\n\n" + snippet;
            break;
        case AddStrategy.Prepend:
            quickCss = snippet + "\n\n" + quickCss;
            break;
    }

    await VencordNative.quickCss.set(quickCss);

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

    const strategy = Settings.plugins.ImportQuickCSS.addStrategy;

    const items: any[] = [];
    const snippets: string[] = [];

    const re = /```css\n(.+?)```/gs;
    let match: string[] | null;
    let i = 0;


    // eslint-disable-next-line no-cond-assign
    while (match = re.exec(content)) {
        const header = `/*\nsnippet ${message.id}-${i} by ${message.author.username}, posted at ${new Date(timestamp).toLocaleString()}\n*/\n`;
        const footer = `/* end snippet ${message.id}-${i} */`;

        const snippet = header + match[1] + footer;
        snippets.push(snippet);

        let label = `Import Snippet "${match[1].substring(0, 5)}`;
        if (match[1].length > 5) {
            label += "...";
        }
        label += '"';

        items.push(<Menu.MenuItem
            id={`vc-import-snippet-${i++}`}
            label={label}
            icon={CSSFileIcon}
            action={async () => await importCssSnippet(snippet, strategy)}
        />);

    }

    if (items.length === 0) return;

    if (items.length === 1) {
        children.splice(-1, 0,
            <Menu.MenuItem
                id={"vc-import-snippet"}
                label={"Import QuickCSS Snippet"}
                icon={CSSFileIcon}
                action={async () => await importCssSnippet(snippets[0], strategy)}
            />);
    }

    else {
        children.splice(-1, 0,
            <Menu.MenuItem
                id="vc-import-snippet-group"
                label="Import QuickCSS Snippets">
                {items}
            </Menu.MenuItem>);
    }
};

const settings = definePluginSettings({
    addStrategy: {
        description: "How to add the QuickCSS snippet",
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
    name: "ImportQuickCSS",
    authors: [Devs.castdrian, Devs.Ven],
    description: "Allows you to import QuickCSS snippets from messages",
    settings,

    start() {
        addContextMenuPatch("message", messageContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("message", messageContextMenuPatch);
    },
});

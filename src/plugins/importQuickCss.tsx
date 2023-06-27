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

function importCssSnippet(snippet: string, strategy: AddStrategy) {
    VencordNative.quickCss.get().then(quickCss => {
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

        VencordNative.quickCss.set(quickCss).then(() => {
            Toasts.show({
                message: "Imported QuickCSS snippet!",
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId(),
                options: {
                    duration: 2000,
                    position: Toasts.Position.BOTTOM,
                },
            });
        });
    });
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    const { message } = props;
    const { content } = message;

    const hasCSSCodeblock = content.includes("```css\n") && content.includes("\n```");
    if (!hasCSSCodeblock) return;

    const snippet = content.split("```css\n")[1].split("\n```")[0];
    const strategy = Settings.plugins.ImportQuickCSS.addStrategy;

    children.splice(-1, 0, (
        <Menu.MenuItem
            id="import-quickcss"
            key="import-quickcss"
            label="Import QuickCSS"
            icon={CSSFileIcon}
            action={() => importCssSnippet(snippet, strategy)}
        />));
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
    authors: [Devs.castdrian],
    description: "Allows you to import QuickCSS snippets from messages",
    settings,

    start() {
        addContextMenuPatch("message", messageContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("message", messageContextMenuPatch);
    },
});

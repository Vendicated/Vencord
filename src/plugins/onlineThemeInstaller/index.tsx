/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

import { ApplicationCommandInputType } from "@api/Commands";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { Card } from "@components/Card";
import { openPluginModal } from "@components/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React } from "@webpack/common";

import { ThemeBrowser } from "./components/ThemeBrowser";
import { fetchHtml } from "./fetchHtml";
import { BD_THEMES_PAGE } from "./types";

export const settings = definePluginSettings({
    installMap: {
        type: OptionType.STRING,
        description: "Internal install tracking",
        hidden: true,
        default: "{}",
    },
    browser: {
        type: OptionType.COMPONENT,
        description: "Browse and install BetterDiscord themes from the official store.",
        component: () => <ThemeBrowser fetchHtml={fetchHtml} />,
    },
});

const plugin = definePlugin({
    name: "OnlineThemeInstaller",
    description: "Browse the BetterDiscord theme store and install themes into Online Themes via GitHub source URLs",
    authors: [Devs.bulwarked],
    tags: ["Appearance", "Customisation"],
    settings,

    settingsAboutComponent: () => (
        <Forms.FormText>
            Install custom client themes with a single click.
        </Forms.FormText>
    ),

    commands: [{
        name: "onlineThemes",
        description: "Open the BetterDiscord theme browser",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: () => openPluginModal(plugin),
    }],

    toolboxActions: {
        "Browse themes": () => openPluginModal(plugin),
        "Open BD theme store": () => VencordNative.native.openExternal(BD_THEMES_PAGE),
    },

    patches: [
        {
            find: "vc-settings-theme-links",
            predicate: () => isPluginEnabled("OnlineThemeInstaller"),
            replacement: {
                match: /(<Flex flexDirection="column" gap="1em">)/,
                replace: "$1<$self.ThemesTabPromo/>,",
            },
        },
    ],

    ThemesTabPromo: ErrorBoundary.wrap(() => (
        <Card defaultPadding>
            <Forms.FormTitle tag="h5">BetterDiscord theme store</Forms.FormTitle>
            <Forms.FormText>
                Browse and install community themes; installs use raw stylesheet URLs from theme metadata.
            </Forms.FormText>
            <Button onClick={() => openPluginModal(plugin)} style={{ marginTop: 8 }}>
                Browse themes
            </Button>
        </Card>
    ), { noop: true }),
});

export default plugin;

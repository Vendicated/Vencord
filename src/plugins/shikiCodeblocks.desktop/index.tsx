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

import "./shiki.css";

import { enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { ReporterTestable } from "@utils/types";
import previewExampleText from "file://previewExample.tsx";

import { shiki } from "./api/shiki";
import { HighlighterContainer } from "./components/Highlighter";
import deviconStyle from "./devicon.css?managed";
import { settings } from "./settings";
import { DeviconSetting } from "./types";
import { clearStyles } from "./utils/createStyle";

export default definePlugin({
    name: "ShikiCodeblocks",
    description: "Brings vscode-style codeblocks into Discord, powered by Shiki",
    tags: ["Appearance", "Chat", "Customisation"],
    authors: [Devs.Vap],
    reporterTestable: ReporterTestable.Patches,
    settings,

    patches: [
        {
            find: "codeBlock:{react(",
            replacement: {
                match: /codeBlock:\{react\((\i),(\i),(\i)\)\{/,
                replace: "$&if(!$self.isIgnored($1.lang))return $self.renderHighlighter($1,$2,$3);"
            }
        },
        {
            find: "#{intl::PREVIEW_NUM_LINES}",
            replacement: {
                match: /(?<=function \i\((\i)\)\{)(?=let\{text:\i,language:)/,
                replace: "if(!$self.isIgnored($1.language))return $self.renderHighlighter({lang:$1.language,content:$1.text});"
            }
        }
    ],

    start: async () => {
        if (settings.store.useDevIcon !== DeviconSetting.Disabled)
            enableStyle(deviconStyle);

        await shiki.init(settings.store.customTheme || settings.store.theme);
    },
    stop: () => {
        shiki.destroy();
        clearStyles();
    },

    settingsAboutComponent: () => <HighlighterContainer lang="tsx" content={previewExampleText} isPreview />,

    // exports
    shiki,
    isIgnored: (lang?: string) => !!lang && settings.store.ignoredLanguages.split(",").some(l => l.trim().toLowerCase() === lang.toLowerCase()),
    renderHighlighter: ({ lang, content }: { lang: string; content: string; }) => {
        return <HighlighterContainer lang={lang?.toLowerCase()} content={content} isPreview={false} />;
    },
});

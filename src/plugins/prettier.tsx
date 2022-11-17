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

import { addPreEditListener, addPreSendListener, removePreEditListener, removePreSendListener } from "../api/MessageEvents";
import { Link } from "../components/Link";
import { makeCodeblock } from "../utils";
import { Devs } from "../utils/constants";
import definePlugin, { OptionType, PluginOptionsItem } from "../utils/types";
import { Settings } from "../Vencord";
import { Forms, React } from "../webpack/common";
const prettierPlugins: Record<string, object> = {};
let prettier;

const options: Record<string, PluginOptionsItem> = {
    FormatOnSend: {
        description: "Format On Send",
        type: OptionType.BOOLEAN,
        default: true
    },
    FormatOnEdit: {
        description: "Format On Edit",
        type: OptionType.BOOLEAN,
        default: true
    },
    trailingComma: {
        description: "Trailing Commas",
        type: OptionType.SELECT,
        options: [
            {
                label: "ES5",
                value: "es5",
                default: true
            },
            {
                label: "All",
                value: "all",
            },
            {
                label: "None",
                value: "none"
            }
        ]
    },
    tabWidth: {
        description: "Tabs Width",
        type: OptionType.NUMBER,
        default: 4
    },
    semi: {
        description: "Semicolons",
        type: OptionType.BOOLEAN,
        default: false
    },
    singleQuote: {
        description: "Single Quote \"  '  \"",
        type: OptionType.BOOLEAN,
        default: false
    },
    parser: {
        description: "Default Parser",
        type: OptionType.SELECT,
        options: [
            {
                label: "Babel",
                value: "babel",
                default: true
            },
            {
                label: "YAML",
                value: "yaml"
            },
            {
                label: "HTML",
                value: "html"
            },
            {
                label: "Markdown",
                value: "markdown"
            },
            {
                label: "CSS",
                value: "postcss"
            },
        ]
    },
    useTabs: {
        description: "Use Tabs",
        type: OptionType.BOOLEAN,
        default: false
    }
};

export default definePlugin({
    name: "Prettier",
    description: "Everyone loves clean code. (Beautifier)",
    authors: [Devs.MaiKokain],
    options: options,
    patches: [
        {
            find: "inQuote:",
            replacement: {
                match: /,content:([^,]+),inQuote/,
                replace: (_, content) => `,content:Vencord.Plugins.plugins.Prettier.PrettifiesMSG(${content}),inQuote`
            }
        }
    ],
    async start() {
        // @ts-ignore
        prettier = (await import("https://unpkg.com/prettier@2.7.1/esm/standalone.mjs"))?.default;
        // Loads parser
        ["babel", "html", "markdown", "postcss", "yaml"].forEach(async x => {
            prettierPlugins[x] = (await import(`https://unpkg.com/prettier@2.7.1/esm/parser-${x}.mjs`))?.default;
        });
        // // Hooks
        this.PrettierPreSend = addPreSendListener((ctx, msg, _) => {
            if (!getSetting("FormatOnSend")) return;
            const un_pretty = this.Prettifies(msg.content, true);
            msg.content = un_pretty.text;
        });

        this.PrettierPreEdit = addPreEditListener((ctx, _, msg) => {
            if (!getSetting("FormatOnEdit")) return;
            const un_pretty = this.Prettifies(msg.content, true);
            msg.content = un_pretty.text;
        });
    },
    stop() {
        removePreSendListener(this.PrettierPreSend);
        removePreEditListener(this.PrettierPreEdit);
    },
    settingsAboutComponent: () => {
        return (
            <React.Fragment>
                <Forms.FormText variant="text-md/normal">
                    See <Link href="https://prettier.io/docs/en/options.html">Prettier documentation</Link> for full details.
                </Forms.FormText>
            </React.Fragment>
        );
    },
    Prettifies(str: string, codeblock = false, opt: PrettierOptions = generateOptions()): { text: string, lang: string; } {
        const res = { text: str, lang: "" };
        const replacemont = /```(.+?)\n(.+?)```/gs.exec(str);
        if (replacemont) {
            opt.parser ??= weDoLoveLanguagesDontWe(replacemont[1]);
            if (replacemont[1] === "json") {
                res.lang = replacemont[1];
                res.text = JSON.stringify(JSON.parse(replacemont[2].toString()), null, getSetting("tabWidth") ?? 2);
                if (codeblock) res.text = makeCodeblock(res.text, res.lang);
                return res;
            }
            res.lang = replacemont[1];
            res.text = prettier.format(replacemont[2], { ...opt, plugins: prettierPlugins });
            if (codeblock) res.text = makeCodeblock(res.text, res.lang);
        }
        return res;
    },
    PrettifiesMSG(content: string) {
        try {
            content = prettier.format(content, { ...generateOptions(), plugins: prettierPlugins });
        } catch (e) { void e; }
        return content;
    },
});

interface PrettierOptions {
    trailingComma: "es5" | "all" | "none",
    tabWidth: number,
    semi: boolean,
    singleQuote: boolean,
    parser: "babel" | "yaml" | "html" | "markdown" | "postcss" | string,
    useTabs: boolean,
}

// all those shorted lang name
function weDoLoveLanguagesDontWe(lang: string): string {
    let langLove: string = "";
    const langsShort = {
        babel: ["js", "javascript", "jsx", "tsx", "typescript", "ts"],
        html: ["vue", "angular", "xml", "html", "xhtml", "rss", "atom", "xjb", "xsd", "xsl", "plist", "svg"],
        css: ["less", "css", "scss"],
        yaml: ["yml", "yaml"],
        markdown: ["md", "markdown"],
    };

    Object.keys(langsShort).forEach(x => {
        if (!langsShort[x].includes(lang)) return;
        langLove = x;
        return;
    });
    return langLove;
}

function getSetting(name: string) {
    if (!Settings.plugins.Prettier[name]) return null;
    return Settings.plugins.Prettier[name];
}

function generateOptions(): PrettierOptions {
    const realOpt: PrettierOptions = {
        trailingComma: "es5",
        tabWidth: 0,
        semi: false,
        singleQuote: false,
        parser: "",
        useTabs: false
    };
    Object.keys(realOpt).forEach(key => {
        const gottenSetting = getSetting(key);
        if (!gottenSetting) return;
        realOpt[key] = gottenSetting;
    });
    return realOpt;
}


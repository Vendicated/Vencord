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

import { addAccessory, removeAccessory } from "@api/MessageAccessories";
import { Settings } from "@api/settings";
import { Devs } from "@utils/constants.js";
import { makeLazy } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { Button, moment, React } from "@webpack/common";
import { Message } from "discord-types/general";

// regex for the win
const parseCodeBlocks = (text: string) => Array.from(text.matchAll(/```(\w+)?((?:.|\s)*?)```/g)).map(([_, lang, code]) => ({ lang, code }));
const useEffect = (...args: Parameters<typeof React.useEffect>) => React.useEffect(...args);
const useState = makeLazy(() => React.useState);
const getCssClassNames = makeLazy(() => findByProps("colorRed"));

interface Snippet {
    authorId: string;
    messageId: string;
    editedTimestamp: number;
    code: string;
}

const SnippetMgrSettings = ({ setValue }: { setValue: (newValue: Snippet[]) => void; }) => {
    const [snippets, setSnippets] = useState()<Snippet[]>([]);

    useEffect(() => {
        // TODO: Make the UI for this, maybe use code blocks to show the css of each snippet?
    }, []);

    return <>hi</>;
};


export default definePlugin({
    name: "CssSnippetManager",
    description: "todo()",
    authors: [Devs.Arjix],
    dependencies: ["MessageAccessoriesAPI"],
    options: {
        cssSnippets: {
            type: OptionType.COMPONENT,
            description: "",
            component: SnippetMgrSettings,
        }
    },
    styles: [] as HTMLStyleElement[],
    start() {
        addAccessory("cssSnippetMgr", this.SnippetManager, 0);

        this.addStyles();
    },
    stop() {
        removeAccessory("cssSnippetMgr");

        this.styles.forEach(style => style.remove());
        while (this.styles.length) this.styles.pop(); // couldn't be bothered to get .clear() to work
    },
    addStyles() {
        const snippets = (Settings.plugins.CssSnippetManager?.cssSnippets as Snippet[] | undefined || []);
        for (const snippet of snippets) {
            let style;
            if (!(style = document.getElementById(`css_snippet_${snippet.authorId}_${snippet.messageId}`))) {
                style = document.createElement("style");
                style.id = `css_snippet_${snippet.authorId}_${snippet.messageId}`;
                document.head.appendChild(style);
            }
            style.innerHTML = snippet.code;

            if (!this.styles.includes(style)) this.styles.push(style);
        }
    },
    removeStyle(snippet: Snippet) {
        const style = document.getElementById(`css_snippet_${snippet.authorId}_${snippet.messageId}`);
        if (style) this.styles = this.styles.filter(st => st.id !== style.id);
        style?.remove();
    },
    SnippetManager(props) {
        const { message }: { message: Message; } = props;
        if (message.channel_id !== "1028106818368589824") return <></>;

        const codeBlocks = parseCodeBlocks(message.content);
        if (codeBlocks.length !== 1) return <></>;

        const [code] = codeBlocks;
        if (code.lang !== "css" && code.lang !== undefined) return <></>;

        // console.log("ayo", { message, code, time: moment(message.timestamp).unix() });

        const snippet = (Settings.plugins.CssSnippetManager?.cssSnippets as Snippet[] | undefined || [])
            .find(snippet => (
                snippet.messageId === message.id &&
                snippet.authorId === message.author.id
            ));

        const timestamp = moment(message.editedTimestamp || message.timestamp).unix();

        const applyOrUpdate = () => {
            const snippets = (Settings.plugins.CssSnippetManager?.cssSnippets as Snippet[] | undefined || []);
            if (snippet !== undefined) {
                for (const snip of snippets) {
                    if (snip.messageId === message.id) {
                        snip.code = code.code;
                        snip.editedTimestamp = timestamp;
                    }
                }
            } else {
                snippets.push({
                    authorId: message.author.id,
                    messageId: message.id,
                    editedTimestamp: timestamp,
                    code: code.code
                });
            }

            Settings.plugins.CssSnippetManager.cssSnippets = snippets;
            (Vencord.Plugins.plugins.CssSnippetManager as any)?.addStyles();
        };
        const removeSnippet = () => {
            snippet && (Vencord.Plugins.plugins.CssSnippetManager as any)?.removeStyle(snippet);

            const snippets = (Settings.plugins.CssSnippetManager?.cssSnippets as Snippet[] | undefined || []);
            Settings.plugins.CssSnippetManager.cssSnippets = snippets.filter(snip => snip.messageId !== message.id);
        };

        return (
            <>{
                snippet !== undefined ? (
                    <div style={{ display: "flex", flexDirection: "row", columnGap: "4%" }}>
                        {timestamp !== snippet.editedTimestamp &&
                            <Button
                                className={getCssClassNames().colorGreen}
                                onClick={applyOrUpdate}
                                size={Button.Sizes.SMALL}
                                style={{ paddingInline: "0" }} // Discord bad, the text does not fit due to the padding ;-;
                            >
                                Update
                            </Button>}
                        <Button
                            className={getCssClassNames().colorRed}
                            onClick={removeSnippet}
                            size={Button.Sizes.SMALL}
                            style={{ paddingInline: "0" }} // Discord bad, the text does not fit due to the padding ;-;
                        >
                            Remove
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={applyOrUpdate}
                        size={Button.Sizes.SMALL}
                    >
                        Apply
                    </Button>
                )
            }</>
        );
    },
});

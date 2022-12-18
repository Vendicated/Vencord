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
import { PlainSettings, Settings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants.js";
import { makeLazy, useForceUpdater } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { Button, ChannelStore, Forms, GuildChannelStore, GuildStore, moment, NavigationRouter, Parser, React, SelectedGuildStore, Toasts } from "@webpack/common";
import { Channel, Guild, Message } from "discord-types/general";

/*
Note:
    The following code block, ```whatever```, would capture `whatever` as the lang, and `` as the code.
    But that doesn't matter, since we strictly only look at code blocks that have `css` as the language.
    Now, you may say that ```css``` would be "valid" according to what I said, but since the code would be empty, it does not harm you.

PS: regex for the win
*/
const parseCodeBlocks = (text: string) => Array.from(text.matchAll(/```(\w+)?((?:.|\s)*?)```/g)).map(([_, lang, code]) => ({ lang, code }));

const useEffect = (...args: Parameters<typeof React.useEffect>) => React.useEffect(...args);
const useState = makeLazy(() => React.useState);
const getCssClassNames = makeLazy(() => findByProps("colorRed"));


interface Snippet {
    authorId: string;
    messageId: string;
    channelId: string;
    guildId: string;
    editedTimestamp: number;
    code: string;
}

// This should ensure that I am dealing with a copy, and not a proxy.
const getSnippets = () => (PlainSettings.plugins.CssSnippetManager?.cssSnippets as Snippet[] ?? []).map(e => Object.assign({}, e) as Snippet);

function CodeBlock(props: { content: string, lang: string; }) {
    return (
        // make text selectable
        <div style={{ userSelect: "text" }}>
            {Parser.defaultRules.codeBlock.react(props, null, {})}
        </div>
    );
}

const SnippetMgrSettings = ({ setValue }: { setValue: (newValue: Snippet[]) => void; }) => {
    const [snippetsGrouped, setSnippetsGrouped] = useState()<{ [guild_id: string]: { [channel_id: string]: Snippet[]; }; }>({});
    const [guilds, setGuilds] = useState()<{ [guild_id: string]: Guild & { channels: Channel[]; }; }>({});
    const forceUpdate = useForceUpdater();

    useEffect(() => {
        const snippets = getSnippets();
        const guilds = {};

        const snippetGroups = {};

        for (const snippet of snippets) {
            if (!snippetGroups[snippet.guildId]) snippetGroups[snippet.guildId] = {};
            if (!snippetGroups[snippet.guildId][snippet.channelId]) snippetGroups[snippet.guildId][snippet.channelId] = [];
            snippetGroups[snippet.guildId][snippet.channelId].push(snippet);

            if (!guilds[snippet.guildId]) {
                const guild = window._.cloneDeep(GuildStore.getGuild(snippet.guildId));
                guild.channels = GuildChannelStore.getChannels(snippet.guildId).SELECTABLE.map(c => c.channel);
                guilds[snippet.guildId] = guild;
            }
        }

        setSnippetsGrouped(snippetGroups);
        setGuilds(guilds);
    }, []);

    return (
        <ErrorBoundary>
            <ul>
                {
                    Object.entries(snippetsGrouped).map(([guild_id, channels]) => {
                        return (
                            <li>
                                <div style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    columnGap: "2%",
                                    marginBlock: "3%"
                                }}>
                                    <img
                                        src={guilds[guild_id].getIconURL(32, false)}
                                        style={{ borderRadius: "50px" }}
                                    />
                                    <Forms.FormText tag="h2">{guilds[guild_id].name}</Forms.FormText>
                                </div>

                                {Object.entries(channels).map(([channel_id, snippets]) => {
                                    return (
                                        <div style={{ marginLeft: "5%" }}>
                                            <div style={{ marginBottom: "2%" }}>
                                                <span
                                                    style={{
                                                        cursor: "pointer",
                                                        color: "var(--link-400)",
                                                        textDecoration: "underline",
                                                        width: "min-conten"
                                                    }}
                                                    onClick={() => {
                                                        if (!ChannelStore.hasChannel(channel_id)) return;
                                                        (document.querySelector("[class^=\"toolsContainer-\"] [class^=\"closeButton-\"]") as any)?.click();
                                                        NavigationRouter.transitionTo(`/channels/${guild_id}/${channel_id}`);
                                                    }}
                                                >
                                                    #{guilds[guild_id].channels.find(c => c.id === channel_id)?.name || "unknown-channel"}
                                                </span>
                                            </div>
                                            <ul style={{ marginLeft: "5%" }}>
                                                {snippets.map(s => (
                                                    <li>
                                                        <div style={{
                                                            marginBottom: "1%",
                                                            marginTop: "5%",
                                                            display: "flex",
                                                            flexDirection: "row",
                                                            columnGap: "2%"
                                                        }}>
                                                            <span
                                                                style={{
                                                                    cursor: "pointer",
                                                                    color: "var(--link-400)",
                                                                    textDecoration: "underline",
                                                                    width: "min-conten"
                                                                }}
                                                                onClick={() => {
                                                                    if (!ChannelStore.hasChannel(channel_id)) return;
                                                                    (document.querySelector("[class^=\"toolsContainer-\"] [class^=\"closeButton-\"]") as any)?.click();
                                                                    NavigationRouter.transitionTo(`/channels/${guild_id}/${channel_id}/${s.messageId}`);
                                                                }}
                                                            >
                                                                Jump to message
                                                            </span>
                                                            <span
                                                                style={{
                                                                    cursor: "pointer",
                                                                    width: "min-conten",
                                                                    color: "var(--text-danger)",
                                                                    textDecoration: "underline",
                                                                }}
                                                                onClick={() => {
                                                                    setSnippetsGrouped(snippets => {
                                                                        snippets[guild_id][channel_id] = snippets[guild_id][channel_id].filter(sn => sn.messageId !== s.messageId);

                                                                        for (const guild of Object.keys(snippets)) {
                                                                            for (const channel of Object.keys(snippets[guild])) {
                                                                                console.log(`ayo, Checking ${guild}.${channel}: ${snippets[guild][channel].length}`);
                                                                                if (!snippets[guild][channel].length) delete snippets[guild][channel];
                                                                            }
                                                                            if (!Object.keys(snippets[guild]).length) delete snippets[guild];
                                                                        }

                                                                        forceUpdate();
                                                                        setValue(Object.values(snippets).map(channels => Object.values(channels)).flat(2));
                                                                        return snippets;
                                                                    });
                                                                }}
                                                            >
                                                                Remove
                                                            </span>
                                                        </div>
                                                        <CodeBlock content={s.code.trim()} lang="css" />
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </li>
                        );
                    })
                }
            </ul>
        </ErrorBoundary>
    );
};

const SnippetManager = ({ message }: { message: Message; }) => {
    const forceUpdate = useForceUpdater();

    const channelsTxt: string = Vencord.PlainSettings.plugins.CssSnippetManager.channels || "";
    const channels = channelsTxt.split(",").map(ch => ch.trim());

    if (!channels.includes(message.channel_id)) return <></>;

    const codeBlocks = parseCodeBlocks(message.content);
    if (codeBlocks.length !== 1) return <></>;

    const [code] = codeBlocks;
    if (code.lang !== "css") return <></>;

    let snippet = getSnippets()
        .find(snippet => (
            snippet.messageId === message.id &&
            snippet.authorId === message.author.id
        ));

    const timestamp = moment(message.editedTimestamp || message.timestamp).unix();

    const applyOrUpdate = () => {
        const snippets = getSnippets();

        let isUpdate = false;
        if (snippet !== undefined) {
            isUpdate = true;
            for (const snip of snippets) {
                if (snip.messageId === message.id) {
                    snip.code = code.code;
                    snip.editedTimestamp = timestamp;
                }
            }
        } else {
            snippet = {
                authorId: message.author.id,
                messageId: message.id,
                channelId: message.channel_id,
                guildId: SelectedGuildStore.getGuildId(),
                editedTimestamp: timestamp,
                code: code.code
            };
            snippets.push(snippet);
        }

        Settings.plugins.CssSnippetManager.cssSnippets = snippets;
        (Vencord.Plugins.plugins.CssSnippetManager as any)?.addStyles();
        forceUpdate();

        Toasts.show({
            message: `Successfully ${isUpdate ? "updated" : "applied"} the snippet!`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId()
        });
    };

    const removeSnippet = () => {
        snippet && (Vencord.Plugins.plugins.CssSnippetManager as any)?.removeStyle(snippet);

        Settings.plugins.CssSnippetManager.cssSnippets = getSnippets().filter(snip => snip.messageId !== message.id);
        forceUpdate();

        Toasts.show({
            message: "Successfully deleted the snippet!",
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId()
        });
    };

    return (
        <div>{
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
        }</div>
    );
};


export default definePlugin({
    name: "CssSnippetManager",
    description: "Allows the user to apply CSS snippets from messages.",
    authors: [Devs.Arjix],
    dependencies: ["MessageAccessoriesAPI"],
    options: {
        cssSnippets: {
            type: OptionType.COMPONENT,
            description: "",
            component: SnippetMgrSettings,
            onChange() {
                const plugin = Vencord.Plugins.plugins.CssSnippetManager!!;
                plugin.stop!!();
                plugin.start!!();
            },
        },
        channels: {
            type: OptionType.STRING,
            default: "1028106818368589824",
            description: "The channel IDs you want to install snippets from. Seperated using a comma. (e.g. 123,456)",
            isValid: value => value.split(",").map(id => /\d+/.test(id.trim()) || id.trim().length === 0).every(id => id),
        }
    },
    styles: [] as HTMLStyleElement[],
    start() {
        addAccessory("cssSnippetMgr", props => {
            return <ErrorBoundary noop>
                <SnippetManager message={props.message} />
            </ErrorBoundary>;
        }, 0);

        this.addStyles();
    },
    stop() {
        removeAccessory("cssSnippetMgr");

        // Delete all the style nodes
        this.styles.forEach(style => style.remove());

        // couldn't be bothered to get .clear() to work
        while (this.styles.length) this.styles.pop();
    },
    addStyles() {
        const snippets = getSnippets();

        for (const snippet of snippets) {
            let style;

            // Attempt to find the style if it already exists, else create a new one.
            if (!(style = document.getElementById(`css_snippet_${snippet.authorId}_${snippet.messageId}`))) {
                style = document.createElement("style");
                style.id = `css_snippet_${snippet.authorId}_${snippet.messageId}`;
                document.head.appendChild(style);
            }
            style.innerHTML = snippet.code;

            // Add the style to an array so it can be easily removed later.
            if (!this.styles.includes(style)) this.styles.push(style);
        }
    },
    removeStyle(snippet: Snippet) {
        const style = document.getElementById(`css_snippet_${snippet.authorId}_${snippet.messageId}`);
        if (style) {
            this.styles = this.styles.filter(st => st.id !== style.id);
            style.remove();
        }
    },
});

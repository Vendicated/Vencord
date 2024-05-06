/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import "./styles.css";

import { ApplicationCommandInputType, ApplicationCommandType, sendBotMessage } from "@api/Commands";
import { Commands, DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Switch } from "@components/Switch";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { useAwaiter } from "@utils/react";
import { wordsToKebab as kebab } from "@utils/text";
import definePlugin, { OptionType } from "@utils/types";
import {
    Button,
    showToast,
    Text,
    TextArea,
    TextInput,
    Toasts,
    useCallback,
    useEffect,
    useState
} from "@webpack/common";

const snippetLogger = new Logger("ScriptSnippets");
const wordsToKebab = (words: string) => kebab(words.split(/[\s\-_]+/).map(s => s.replace(/[^\w]/g, "")));

const SNIPPET_KEY = "ScriptSnippets_snippets";

type Snippets = Snippet[];
interface Snippet {
    trigger: ScriptTrigger;
    key: string;
    code: string;
    name: string;
}

enum ScriptTrigger {
    STARTUP = "startup",
    SLASH_COMMAND = "command"
}

const SnippetSettings = ({ snippet, update, delete: del }: { snippet: Snippet, update: (newSnippet: Snippet) => void, delete: () => void }) => {
    const [code, setCode] = useState(snippet.code);
    const [name, setName] = useState(wordsToKebab(snippet.name));
    const [trigger, setTrigger] = useState(snippet.trigger);

    return <form onSubmit={event => {
        event.preventDefault();

        update({ ...snippet, code, name, trigger });
    }}>
        <div className="vc-scriptsnippets-settings-script">
            <div>
                <TextInput required value={name} onChange={setName} name="name" placeholder="My script"/>
                <div className="vc-scriptsnippets-settings-startup"><Text>Run on startup</Text> <Switch checked={trigger === ScriptTrigger.STARTUP} onChange={() => setTrigger(prev => prev === ScriptTrigger.STARTUP ? ScriptTrigger.SLASH_COMMAND : ScriptTrigger.STARTUP)} /></div>
            </div>
            <div className="vc-scriptsnippets-settings-btn">
                <Button type="submit" size={Button.Sizes.SMALL}>Save</Button>
                <Button type="button" onClick={del} size={Button.Sizes.SMALL} color={Button.Colors.RED}>Delete</Button>
            </div>
        </div>
        <TextArea required value={code} onChange={setCode} name="code" placeholder="console.log('Hello world!');" />
    </form>;
};

const settings = definePluginSettings({
    snippets: {
        type: OptionType.COMPONENT,
        description: "Add snippets to run on certain triggers",
        component: () => {
            const [loadedSnippets, err, pending] = useAwaiter(() => DataStore.get<Snippets>(SNIPPET_KEY));

            const [realSnippets, setRealSnippets] = useState<Snippets>(loadedSnippets || []);

            useEffect(() => {
                if (!pending && !err) {
                    setRealSnippets(loadedSnippets || []);
                }
            }, [pending]);

            const updateSnippet = useCallback((newSnippet: Snippet) => {
                if (!newSnippet.code || !newSnippet.name) return showToast("Name and code are required", Toasts.Type.FAILURE);

                const newSnippets = realSnippets.filter(snippet => snippet.key !== newSnippet.key);
                newSnippets.push(newSnippet);
                setRealSnippets(newSnippets);

                DataStore.set(SNIPPET_KEY, newSnippets).then(() => {
                    Commands.unregisterCommand(wordsToKebab(newSnippet.name));
                    Commands.registerCommand(createCommand(newSnippet), "ScriptSnippets");

                    showToast("Your script has been updated", Toasts.Type.SUCCESS);
                }).catch(err => {
                    showToast("There was an error updating your script: " + err, Toasts.Type.FAILURE);
                });
            }, [realSnippets]);

            const deleteSnippet = useCallback((key: string) => {
                const newSnippets = realSnippets.filter(snippet => snippet.key !== key);
                setRealSnippets(newSnippets);

                DataStore.set(SNIPPET_KEY, newSnippets).then(() => {
                    showToast("Your script has been deleted", Toasts.Type.SUCCESS);
                }).catch(err => {
                    showToast("There was an error deleting your script: " + err, Toasts.Type.FAILURE);
                });
            }, [realSnippets]);

            if (pending) return <Text>Loading snippets...</Text>;

            if (err) return <Text>There was an error loading snippets: {err}</Text>;

            return (
                <>
                    <Text>Snippets you create will be registered as a slash command. Changes require a restart to take effect.</Text>

                    {realSnippets?.map(snippet => <SnippetSettings snippet={snippet} update={updateSnippet} delete={() => deleteSnippet(snippet.key)} />)}

                    <Button onClick={() => {
                        setRealSnippets(snippets => [...snippets, {
                            code: "",
                            trigger: ScriptTrigger.SLASH_COMMAND,
                            // TODO: get a new way to generate unique keys
                            key: Date.now().toString(),
                            name: ""
                        }]);
                    }}>Create a script</Button>
                </>
            );
        }
    }
});

const createCommand = (snippet: Snippet) => ({
    name: wordsToKebab(snippet.name),
    description: "Run this script",
    type: ApplicationCommandType.CHAT_INPUT,
    inputType: ApplicationCommandInputType.BUILT_IN,
    isVencordCommand: true,
    execute: async (_, ctx) => {
        try {
            snippetLogger.debug(`Running script: ${snippet.name}`, snippet.code);

            await eval(snippet.code);

            snippetLogger.debug(`Script executed successfully: ${snippet.name}`);

            sendBotMessage(ctx.channel.id, {
                content: "Script executed successfully"
            });
        } catch (e) {
            snippetLogger.debug(`Error running script: ${e}`);

            sendBotMessage(ctx.channel.id, {
                content: `There was an error running your script:\n\n\`\`\`${e}\`\`\``
            });
        }
    }
});

export default definePlugin({
    name: "ScriptSnippets",
    description: "Add snippets to run on certain triggers",
    authors: [Devs.splatter],
    dependencies: ["CommandsAPI"],
    settings,
    async start() {
        const snippets = await DataStore.get<Snippets>(SNIPPET_KEY);

        snippetLogger.info(`Loaded ${snippets?.length ?? 0} snippets`);

        if (snippets) for (const snippet of snippets) {
            switch (snippet.trigger) {
                case ScriptTrigger.SLASH_COMMAND: {
                    Commands.registerCommand(createCommand(snippet), "ScriptSnippets");
                    break;
                }
                case ScriptTrigger.STARTUP: {
                    try {
                        eval(snippet.code);
                    } catch (e) {
                        snippetLogger.error(`Error running startup script: ${e}`);
                    }

                    break;
                }
                default: {
                    snippetLogger.error(`Invalid trigger: ${snippet.trigger}`);
                    break;
                }
            }
        }
    },
    async stop() {
        const snippets = await DataStore.get(SNIPPET_KEY);

        const commands = snippets?.map(snippet => wordsToKebab(snippet.name));

        if (commands) {
            for (const command of commands) {
                Commands.unregisterCommand(command);
            }
        }
    }
});

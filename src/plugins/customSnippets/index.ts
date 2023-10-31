/**
 * Custom Snippets
 * Create custom snippets that send text to the chat.
 * 
 * Possible Improvements:
 * - Allow for multi-line snippets via showing a modal
 * - Create a view for all of the snippets (allowing in-line editing, enabling, configuring, etc.) within settings
 * - Allow for custom variables + Regex
 * - An icon on the chat bar that shows all of the snippets, allowing them to be inserted into chat
 * 
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, commands, findOption, registerCommand, sendBotMessage, unregisterCommand } from "@api/Commands";
import { DataStore } from "@api/index";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

interface CustomSnippetsData {
    snippets: Record<string, string>
}

// Registers a custom snippet
function defineSnippet(name: string, content: string) {
    registerCommand({
        name: `snippet ${name}`,
        description: `Sends a custom snippet: ${name}`,
        options: [
            {
                name: "user",
                type: ApplicationCommandOptionType.USER,
                description: "The user to mention.",
                required: false,
            }
        ],
        execute(args, _ctx) {
            let content_send: string = content;

            // Custom variables
            let user_opt = findOption(args, "user", "");
            if (user_opt) {
                content_send = content_send.replace("{user}", `<@${user_opt}>`);
            }

            // Send the message
            return {
                content: content_send,
            };
        },
    }, "Custom Snippets")
}

// Re-registers the delete command with the new options
async function registerDeleteCommand() {
    const snippetDelete = commands["snippet delete"];
    const options = snippetDelete.options;
    const nameOption = options?.find((option) => option.name == "name");
    if (nameOption) {
        const customSnippets = await DataStore.get("customSnippets") as CustomSnippetsData;
        nameOption.choices = Object.keys(customSnippets.snippets).map((option) => {
            return {
                label: option,
                name: option,
                value: option,
            };
        });
        DataStore.set("customSnippets", customSnippets);

        unregisterCommand("snippet delete");
        registerCommand(snippetDelete, "Custom Snippets");
    }
}

export default definePlugin({
    name: "Custom Snippets",
    description: "Create custom snippets that send text to the chat.",
    authors: [Devs.Stefan],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "snippet create",
            description: "Create a custom snippet.",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                {
                    name: "name",
                    type: ApplicationCommandOptionType.STRING,
                    description: "The name of the snippet.",
                    required: true,
                },
                {
                    name: "content",
                    type: ApplicationCommandOptionType.STRING,
                    description: "The content of the snippet.",
                    required: true,
                },
            ],
            execute: async (args, ctx) => {
                // Prevents against snippets that cannot be sent
                const content = findOption(args, "content", "");
                if (content.length == 0) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "The content of the snippet is too short.",
                    });
                }
                if (content.length > 2000) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "The content of the snippet is too long.",
                    });
                }

                // Check if the command already exists
                const name = findOption(args, "name", "");
                const customSnippets = await DataStore.get("customSnippets") as CustomSnippetsData;
                if (customSnippets.snippets[name]) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "A snippet with this name already exists.",
                    });
                }

                // Create the command
                defineSnippet(name, content);
                customSnippets.snippets[name] = content;
                DataStore.set("customSnippets", customSnippets);
                
                // Update the delete command options
                registerDeleteCommand();

                // Success!
                return sendBotMessage(ctx.channel.id, {
                    content: "Snippet created.",
                });
            },
        },
        {
            name: "snippet delete",
            description: "Delete a custom snippet.",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                {
                    name: "name",
                    type: ApplicationCommandOptionType.STRING,
                    description: "The name of the snippet.",
                    required: true,
                    choices: []
                },
            ],
            execute: async (args, ctx) => {
                // To avoid duplicate code
                const name = findOption(args, "name", "");
                const customSnippets = await DataStore.get("customSnippets") as CustomSnippetsData;
                if (customSnippets[name] == undefined) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "A snippet with this name does not exist.",
                    });
                }

                // Catch any errors
                if (unregisterCommand(`snippet ${name}`)) {
                    delete customSnippets.snippets[name];
                    DataStore.set("customSnippets", customSnippets);

                    registerDeleteCommand();
                    return sendBotMessage(ctx.channel.id, {
                        content: "Snippet deleted.",
                    });
                } else {
                    return sendBotMessage(ctx.channel.id, {
                        content: "An error occured while deleting the snippet.",
                    });
                }
            },
        },
    ],
    async start() {
        // Initialise the custom snippets
        const customSnippets = await DataStore.get("customSnippets") as CustomSnippetsData | undefined;
        if (!customSnippets) {
            await DataStore.set("customSnippets", {
                snippets: {},
            } as CustomSnippetsData);
        } else {
            for (const [name, content] of Object.entries(customSnippets.snippets)) {
                defineSnippet(name, content);
            }
        }

        // Update the delete command options
        await registerDeleteCommand();
    }
});

import { sendMessage } from "@utils/discord";

import {
    ApplicationCommandInputType,
    ApplicationCommandOptionType,
    findOption,
    registerCommand,
    sendBotMessage,
    unregisterCommand
} from "@api/Commands";

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

import {
    ChannelStore,
    SelectedChannelStore,
    SelectedGuildStore,
    VoiceStateStore,
    MessageStore,
    RestAPI,
    useState
} from "@webpack/common";

interface CommandRule {
    command: string;
    serverId: string;
    message: string;
    addSquareBracketsToVcCapacity?: boolean;
    setMessageAsChannelStatus?: boolean;
    deletePreviousCommand?: boolean;
    updateVcCapacity?: boolean;
}

interface TrackedCommandMessage {
    messageId: string;
    intervalId?: ReturnType<typeof setInterval>;
}

const DEFAULT_RULES: CommandRule[] = [
    {
        command: "lfg",
        serverId: "574217343635554305",
        message: "EU competitive Chill\n{link}",
        addSquareBracketsToVcCapacity: false,
        setMessageAsChannelStatus: false,
        deletePreviousCommand: false,
        updateVcCapacity: false
    }
];

const settings = definePluginSettings({
    rules: {
        type: OptionType.CUSTOM,
        default: DEFAULT_RULES as CommandRule[]
    },

    editor: {
        type: OptionType.COMPONENT,
        component: () => <Editor />
    }
});

const normalizeName = (s: string) =>
    s.replace(/^\//, "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);

const getRules = (): CommandRule[] => settings.store.rules ?? [];

// Exact server match wins, otherwise fall back to the "any server" rule.
function findRule(name: string, guildId?: string | null) {
    const rules = getRules().filter(
        r => normalizeName(r.command) === name && r.message.trim()
    );

    return rules.find(r => r.serverId && r.serverId === guildId)
        ?? rules.find(r => !r.serverId);
}

// Tracks the latest message for each command in each text channel.
// All tracking is in-memory and is cleared when the plugin stops.
const activeMessages = new Map<string, TrackedCommandMessage>();

function getMessageTrackerKey(commandName: string, channelId: string) {
    return `${commandName}:${channelId}`;
}

function stopTracking(record?: TrackedCommandMessage) {
    if (record?.intervalId) {
        clearInterval(record.intervalId);
        record.intervalId = undefined;
    }
}

function getVoiceCapacity(channelId: string, channel: any, addBrackets: boolean) {
    const voiceStates = VoiceStateStore.getVoiceStatesForChannel(channelId);
    const count = Object.keys(voiceStates ?? {}).length;
    const limit = channel.userLimit ?? channel.user_limit ?? 0;

    const capacity = limit > 0
        ? `${count}/${limit}`
        : `${count}/∞`;

    return addBrackets ? `[${capacity}]` : capacity;
}

function makeCommand(name: string) {
    return {
        name,
        description: "Custom message command",
        inputType: ApplicationCommandInputType.BUILT_IN,

        predicate: (ctx: any) => !!findRule(name, ctx.guild?.id),

        options: [
            {
                name: "channel",
                description: "Channel to link (default: the voice channel you're in)",
                type: ApplicationCommandOptionType.CHANNEL,
                required: false
            },
            {
                name: "text",
                description: "Extra text, available as {text} in the message",
                type: ApplicationCommandOptionType.STRING,
                required: false
            }
        ],

        execute: async (args: any, ctx: any) => {
            const reply = (content: string) => {
                sendBotMessage(ctx.channel.id, { content });
            };

            const rule = findRule(name, ctx.guild?.id);

            if (!rule) {
                return reply(`/${name} isn't set up for this server.`);
            }

            const setStatus = rule.setMessageAsChannelStatus ?? false;
            const addBrackets = rule.addSquareBracketsToVcCapacity ?? false;
            const deletePrevious = rule.deletePreviousCommand ?? false;
            const updateVcCapacity = rule.updateVcCapacity ?? false;

            const hasVcCapacity = /\{vcCapacity\}/.test(rule.message);

            const vars: Record<string, string> = {
                text: findOption<string>(args, "text") ?? "",
                link: "",
                channel: "",
                channel_name: "",
                vcCapacity: ""
            };

            let channel: any = null;
            let channelId: string | null = null;

            // Resolve the voice channel if needed by a variable,
            // channel status, or live capacity updating.
            if (
                setStatus ||
                (updateVcCapacity && hasVcCapacity) ||
                /\{(link|channel|channel_name|vcCapacity)\}/.test(rule.message)
            ) {
                channelId =
                    findOption<string>(args, "channel")
                    ?? SelectedChannelStore.getVoiceChannelId();

                if (!channelId) {
                    return reply("Join a voice channel first, or pick one with `channel:`.");
                }

                channel = ChannelStore.getChannel(channelId);

                if (!channel?.guild_id) {
                    return reply("Couldn't find that channel.");
                }

                if (ctx.guild && channel.guild_id !== ctx.guild.id) {
                    return reply("That channel is in a different server, so the link wouldn't work here.");
                }

                if (hasVcCapacity) {
                    if (channel.type !== 2 && channel.type !== 13) {
                        return reply("The selected channel isn't a voice channel.");
                    }

                    vars.vcCapacity = getVoiceCapacity(
                        channelId,
                        channel,
                        addBrackets
                    );
                }

                vars.link = `https://discord.com/channels/${channel.guild_id}/${channel.id}`;
                vars.channel = `<#${channel.id}>`;
                vars.channel_name = channel.name;
            }

            // Set the voice channel status using the configured message.
            // All placeholders, including {text}, are excluded.
            if (setStatus) {
                if (channel.type !== 2 && channel.type !== 13) {
                    return reply("The selected channel isn't a voice channel.");
                }

                const statusText = rule.message
                    .replace(/\{[^{}]*\}/g, "")
                    .replace(/\s+/g, " ")
                    .trim()
                    .slice(0, 500);

                if (!statusText) {
                    return reply("There is no text available to use as the voice channel status.");
                }

                try {
                    await RestAPI.put({
                        url: `/channels/${channelId}/voice-status`,
                        body: {
                            status: statusText
                        }
                    });
                } catch (err) {
                    console.error("[userCommands] Failed to update voice channel status:", err);
                    return reply("Couldn't update the voice channel status. Check your permissions and try again.");
                }
            }

            // Render the message. This function is also reused by the
            // capacity updater to regenerate the message with a new count.
            const renderContent = (capacity: string) =>
                rule.message
                    .replace(
                        /\{(link|channel|channel_name|text|vcCapacity)\}/g,
                        (_, key) => key === "vcCapacity"
                            ? capacity
                            : vars[key] ?? ""
                    )
                    .trim();

            const content = renderContent(vars.vcCapacity);

            if (!content) {
                return reply("The message for this command is empty.");
            }

            // Send the new message first. If sending fails, the previous
            // message and its capacity updater remain untouched.
            let sentMessage: any;

            try {
                sentMessage = await sendMessage(
                    ctx.channel.id,
                    { content },
                    false
                );
            } catch (err) {
                console.error(`[userCommands] Failed to send /${name}:`, err);
                return reply(`Couldn't send the message for /${name}.`);
            }

            const trackerKey = getMessageTrackerKey(name, ctx.channel.id);
            const previousRecord = activeMessages.get(trackerKey);

            // Stop monitoring the previous message, if there is one.
            if (previousRecord) {
                stopTracking(previousRecord);

                if (deletePrevious) {
                    try {
                        await RestAPI.del({
                            url: `/channels/${ctx.channel.id}/messages/${previousRecord.messageId}`
                        });
                    } catch (err) {
                        console.error(
                            `[userCommands] Failed to delete the previous /${name} message:`,
                            err
                        );

                        reply(
                            `Couldn't delete the previous message for /${name}. The new message was still sent.`
                        );
                    }
                }
            }

            // Get the ID of the newly sent message.
            const sentMessageId =
                sentMessage?.id
                ?? sentMessage?.message?.id
                ?? MessageStore.getLastMessage(ctx.channel.id)?.id;

            if (!sentMessageId) {
                console.error(`[userCommands] Couldn't obtain the message ID for /${name}.`);
                return;
            }

            const currentRecord: TrackedCommandMessage = {
                messageId: sentMessageId
            };

            activeMessages.set(trackerKey, currentRecord);

            // Start live capacity updates only when both the toggle
            // and the {vcCapacity} placeholder are present.
            if (updateVcCapacity && hasVcCapacity && channelId) {
                let lastCapacity = vars.vcCapacity;
                let isUpdating = false;

                currentRecord.intervalId = setInterval(async () => {
                    // Ignore old timers if a newer command execution
                    // has replaced this message.
                    if (activeMessages.get(trackerKey) !== currentRecord) {
                        stopTracking(currentRecord);
                        return;
                    }

                    if (isUpdating) return;

                    isUpdating = true;

                    try {
                        const currentChannel = ChannelStore.getChannel(channelId);

                        if (
                            !currentChannel ||
                            (currentChannel.type !== 2 && currentChannel.type !== 13)
                        ) {
                            stopTracking(currentRecord);
                            return;
                        }

                        const newCapacity = getVoiceCapacity(
                            channelId,
                            currentChannel,
                            addBrackets
                        );

                        // Avoid unnecessary Discord API requests.
                        if (newCapacity === lastCapacity) return;

                        const updatedContent = renderContent(newCapacity);

                        await RestAPI.patch({
                            url: `/channels/${ctx.channel.id}/messages/${sentMessageId}`,
                            body: {
                                content: updatedContent
                            }
                        });

                        lastCapacity = newCapacity;
                    } catch (err) {
                        console.error(
                            `[userCommands] Failed to update VC capacity for /${name}:`,
                            err
                        );

                        // Stop polling if the message can no longer be edited.
                        stopTracking(currentRecord);
                    } finally {
                        isUpdating = false;
                    }
                }, 10_000);
            }
        }
    };
}

const registered = new Set<string>();

function unregisterAll() {
    for (const name of registered) {
        try {
            unregisterCommand(name);
        } catch {
            // Command was already unregistered.
        }
    }

    registered.clear();
}

function syncCommands() {
    unregisterAll();

    const names = new Set(
        getRules()
            .filter(r => r.message.trim())
            .map(r => normalizeName(r.command))
            .filter(Boolean)
    );

    for (const name of names) {
        try {
            registerCommand(makeCommand(name) as any, "userCommands");
            registered.add(name);
        } catch (err) {
            console.error(`[userCommands] Couldn't register /${name}`, err);
        }
    }
}

/* ---------- Settings UI ---------- */

const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    borderRadius: 4,
    border: "1px solid var(--border-subtle, #3f4147)",
    background: "var(--input-background, #1e1f22)",
    color: "var(--text-default, var(--text-normal, #dbdee1))",
    fontSize: 14,
    fontFamily: "inherit"
} as const;

const buttonStyle = {
    padding: "8px 12px",
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
    background: "var(--brand-500, #5865f2)",
    color: "#fff",
    fontSize: 14
} as const;

const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    opacity: 0.75,
    marginBottom: 4
} as const;

const normalizeRules = (rules: CommandRule[]): CommandRule[] =>
    rules.map(rule => ({
        ...rule,
        addSquareBracketsToVcCapacity: rule.addSquareBracketsToVcCapacity ?? false,
        setMessageAsChannelStatus: rule.setMessageAsChannelStatus ?? false,
        deletePreviousCommand: rule.deletePreviousCommand ?? false,
        updateVcCapacity: rule.updateVcCapacity ?? false
    }));

function Editor() {
    const [savedRules, setSavedRules] = useState<CommandRule[]>(
        () => normalizeRules(getRules())
    );

    const [rules, setRules] = useState<CommandRule[]>(
        () => normalizeRules(getRules())
    );

    const hasUnsavedChanges =
        JSON.stringify(rules) !== JSON.stringify(savedRules);

    const edit = (i: number, patch: Partial<CommandRule>) => {
        setRules(current =>
            current.map((rule, idx) =>
                idx === i ? { ...rule, ...patch } : rule
            )
        );
    };

    const remove = (i: number) => {
        setRules(current => current.filter((_, idx) => idx !== i));
    };

    const add = () => {
        setRules(current => [
            ...current,
            {
                command: "",
                serverId: "",
                message: "",
                addSquareBracketsToVcCapacity: false,
                setMessageAsChannelStatus: false,
                deletePreviousCommand: false,
                updateVcCapacity: false
            }
        ]);
    };

    const save = () => {
        const nextRules = normalizeRules(rules);

        settings.store.rules = nextRules;
        setRules(nextRules);
        setSavedRules(nextRules);

        syncCommands();
    };

    const discard = () => {
        setRules(normalizeRules(savedRules));
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.4 }}>
                Variables: <code>{"{link}"}</code> link to your voice channel,{" "}
                <code>{"{channel}"}</code> channel mention,{" "}
                <code>{"{channel_name}"}</code> channel name,{" "}
                <code>{"{vcCapacity}"}</code> voice channel occupants / capacity,{" "}
                <code>{"{text}"}</code> the optional <code>text:</code> argument.
                <br />
                Same command name + different server ID = different message per server.
                Leave the server ID empty to use it everywhere.
                <br />
                Live VC capacity updating requires the <code>{"{vcCapacity}"}</code> placeholder.
            </div>

            {rules.map((rule, i) => {
                const duplicate = rules.some(
                    (other, j) =>
                        j !== i &&
                        normalizeName(other.command) === normalizeName(rule.command) &&
                        other.serverId === rule.serverId
                );

                return (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            padding: 12,
                            borderRadius: 8,
                            border: "1px solid var(--border-subtle, #3f4147)"
                        }}
                    >
                        <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                                <div style={labelStyle}>Command</div>
                                <input
                                    style={inputStyle}
                                    placeholder="lfg"
                                    value={rule.command}
                                    onChange={e =>
                                        edit(i, {
                                            command: normalizeName(e.currentTarget.value)
                                        })
                                    }
                                />
                            </div>

                            <div style={{ flex: 2 }}>
                                <div style={labelStyle}>Server ID (empty = all)</div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <input
                                        style={inputStyle}
                                        placeholder="all servers"
                                        value={rule.serverId}
                                        onChange={e =>
                                            edit(i, {
                                                serverId: e.currentTarget.value.replace(/\D/g, "")
                                            })
                                        }
                                    />

                                    <button
                                        style={{ ...buttonStyle, whiteSpace: "nowrap" }}
                                        onClick={() => {
                                            const id = SelectedGuildStore.getGuildId();
                                            if (id) edit(i, { serverId: id });
                                        }}
                                    >
                                        This server
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={labelStyle}>Message</div>
                            <textarea
                                style={{
                                    ...inputStyle,
                                    minHeight: 70,
                                    resize: "vertical"
                                }}
                                placeholder={"EU competitive Chill\n{vcCapacity}\n{link}"}
                                value={rule.message}
                                onChange={e =>
                                    edit(i, { message: e.currentTarget.value })
                                }
                            />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                <input
                                    type="checkbox"
                                    checked={rule.addSquareBracketsToVcCapacity ?? false}
                                    onChange={e =>
                                        edit(i, {
                                            addSquareBracketsToVcCapacity: e.currentTarget.checked
                                        })
                                    }
                                />
                                Add square brackets to vcCapacity
                            </label>

                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                <input
                                    type="checkbox"
                                    checked={rule.setMessageAsChannelStatus ?? false}
                                    onChange={e =>
                                        edit(i, {
                                            setMessageAsChannelStatus: e.currentTarget.checked
                                        })
                                    }
                                />
                                Set message as channel status
                            </label>

                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                <input
                                    type="checkbox"
                                    checked={rule.deletePreviousCommand ?? false}
                                    onChange={e =>
                                        edit(i, {
                                            deletePreviousCommand: e.currentTarget.checked
                                        })
                                    }
                                />
                                Delete previous command
                            </label>

                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                <input
                                    type="checkbox"
                                    checked={rule.updateVcCapacity ?? false}
                                    onChange={e =>
                                        edit(i, {
                                            updateVcCapacity: e.currentTarget.checked
                                        })
                                    }
                                />
                                Update VC Capacity
                            </label>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    color: duplicate ? "#f23f42" : undefined,
                                    opacity: duplicate ? 1 : 0.7
                                }}
                            >
                                {duplicate
                                    ? "Duplicate command + server: only the first one is used."
                                    : rule.command
                                        ? `Registered as /${normalizeName(rule.command)}`
                                        : "Enter a command name"}
                            </div>

                            <button
                                style={{ ...buttonStyle, background: "#da373c" }}
                                onClick={() => remove(i)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                );
            })}

            <div>
                <button style={buttonStyle} onClick={add}>
                    + Add command
                </button>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    paddingTop: 12,
                    borderTop: "1px solid var(--border-subtle, #3f4147)"
                }}
            >
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {hasUnsavedChanges
                        ? "You have unsaved changes."
                        : "All changes saved."}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        style={{
                            ...buttonStyle,
                            background: "var(--background-modifier-accent, #4e5058)",
                            opacity: hasUnsavedChanges ? 1 : 0.5
                        }}
                        disabled={!hasUnsavedChanges}
                        onClick={discard}
                    >
                        Discard changes
                    </button>

                    <button
                        style={{
                            ...buttonStyle,
                            opacity: hasUnsavedChanges ? 1 : 0.5
                        }}
                        disabled={!hasUnsavedChanges}
                        onClick={save}
                    >
                        Save changes
                    </button>
                </div>
            </div>
        </div>
    );
}

export default definePlugin({
    name: "userCommands",
    description: "Create your own slash commands (with per-server messages) from the plugin settings",
    authors: [{ name: "thcProphet", id: 828010614349365288n }],
    settings,

    start() {
        syncCommands();
    },

    stop() {
        unregisterAll();

        for (const record of activeMessages.values()) {
            stopTracking(record);
        }

        activeMessages.clear();
    }
});

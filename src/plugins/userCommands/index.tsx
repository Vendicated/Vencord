import { sendMessage } from "@utils/discord";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, registerCommand, sendBotMessage, unregisterCommand } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, SelectedChannelStore, SelectedGuildStore, useState } from "@webpack/common";

interface CommandRule {
    command: string;
    serverId: string;
    message: string;
}

const DEFAULT_RULES: CommandRule[] = [{
    command: "lfg",
    serverId: "574217343635554305",
    message: "EU competitive Chill\n{link}"
}];

export const settings = definePluginSettings({
    rules: { type: OptionType.CUSTOM, default: DEFAULT_RULES as CommandRule[] },
    editor: { type: OptionType.COMPONENT, component: () => <RulesEditor /> }
});

const normalizeName = (s: string) => s.replace(/^\//, "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
const getRules = (): CommandRule[] => settings.store.rules ?? [];

function findRule(name: string, guildId?: string | null) {
    const rules = getRules().filter(r => normalizeName(r.command) === name && r.message.trim());
    return rules.find(r => r.serverId && r.serverId === guildId) ?? rules.find(r => !r.serverId);
}

function makeCommand(name: string) {
    return {
        name,
        description: "Custom message command",
        inputType: ApplicationCommandInputType.BUILT_IN,
        predicate: (ctx: any) => !!findRule(name, ctx.guild?.id),
        options: [
            { name: "channel", description: "Channel to link (default: the voice channel you're in)", type: ApplicationCommandOptionType.CHANNEL, required: false },
            { name: "text", description: "Extra text, available as {text} in the message", type: ApplicationCommandOptionType.STRING, required: false }
        ],
        execute: (args: any, ctx: any) => {
            const reply = (content: string) => sendBotMessage(ctx.channel.id, { content });
            const rule = findRule(name, ctx.guild?.id);
            if (!rule) return reply(`/${name} isn't set up for this server.`);

            const vars: Record<string, string> = {
                text: findOption<string>(args, "text") ?? "",
                link: "",
                channel: "",
                channel_name: "",
                vcCapacity: ""
            };

            if (/\{(link|channel|channel_name|vcCapacity)\}/.test(rule.message)) {
                const channelId = findOption<string>(args, "channel") ?? SelectedChannelStore.getVoiceChannelId();
                if (!channelId) return reply("Join a voice channel first, or pick one with `channel:`.");
                const channel = ChannelStore.getChannel(channelId);
                if (!channel?.guild_id) return reply("Couldn't find that channel.");
                if (ctx.guild && channel.guild_id !== ctx.guild.id) return reply("That channel is in a different server, so the link wouldn't work here.");

                vars.link = `https://discord.com/channels/${channel.guild_id}/${channel.id}`;
                vars.channel = `<#${channel.id}>`;
                vars.channel_name = channel.name;
            }

            const content = rule.message.replace(/\{(link|channel|channel_name|text|vcCapacity)\}/g, (_, key) => vars[key] ?? "").trim();
            if (!content) return reply("The message for this command is empty.");
            sendMessage(ctx.channel.id, { content }, false);
        }
    };
}

const registered = new Set<string>();

function unregisterAll() {
    for (const name of registered) {
        try {
            unregisterCommand(name);
        } catch (err) {
            console.warn(`[userCommands] Command /${name} was already unregistered`, err);
        }
    }
    registered.clear();
}

function syncCommands() {
    unregisterAll();
    const names = new Set(getRules().filter(rule => rule.message.trim()).map(rule => normalizeName(rule.command)).filter(Boolean));
    for (const name of names) {
        try {
            registerCommand(makeCommand(name) as any, "userCommands");
            registered.add(name);
        } catch (err) {
            console.error(`[userCommands] Couldn't register /${name}`, err);
        }
    }
}

const inputStyle = {
    width: "100%", boxSizing: "border-box" as const, padding: "8px 10px", borderRadius: 4,
    border: "1px solid var(--border-subtle, #3f4147)", background: "var(--input-background, #1e1f22)",
    color: "var(--text-default, var(--text-normal, #dbdee1))", fontSize: 14, fontFamily: "inherit"
};
const buttonStyle = { padding: "8px 12px", borderRadius: 4, border: "none", cursor: "pointer", background: "var(--brand-500, #5865f2)", color: "#fff", fontSize: 14 };
const labelStyle = { fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, opacity: 0.75, marginBottom: 4 };

export function RulesEditor() {
    const [rules, setRules] = useState<CommandRule[]>(() => getRules());
    const commit = (next: CommandRule[]) => {
        setRules(next);
        settings.store.rules = next;
        syncCommands();
    };
    const edit = (index: number, patch: Partial<CommandRule>) => commit(rules.map((rule, i) => i === index ? { ...rule, ...patch } : rule));
    const remove = (index: number) => commit(rules.filter((_, i) => i !== index));
    const add = () => commit([...rules, { command: "", serverId: "", message: "" }]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.4 }}>
                Variables: <code>{"{link}"}</code> voice-channel link, <code>{"{channel}"}</code> channel mention, <code>{"{channel_name}"}</code> channel name, <code>{"{text}"}</code> optional text argument, <code>{"{vcCapacity}"}</code> voice-channel capacity.
                <br />Same command name + different server ID = different message per server. Leave the server ID empty to use it everywhere.
            </div>
            {rules.map((rule, i) => {
                const duplicate = rules.some((other, j) => j !== i && normalizeName(other.command) === normalizeName(rule.command) && other.serverId === rule.serverId);
                return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 8, border: "1px solid var(--border-subtle, #3f4147)" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                                <div style={labelStyle}>Command</div>
                                <input style={inputStyle} placeholder="lfg" value={rule.command} onChange={event => edit(i, { command: normalizeName(event.currentTarget.value) })} />
                            </div>
                            <div style={{ flex: 2 }}>
                                <div style={labelStyle}>Server ID (empty = all)</div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <input style={inputStyle} placeholder="all servers" value={rule.serverId} onChange={event => edit(i, { serverId: event.currentTarget.value.replace(/\D/g, "") })} />
                                    <button style={{ ...buttonStyle, whiteSpace: "nowrap" }} onClick={() => {
                                        const id = SelectedGuildStore.getGuildId();
                                        if (id) edit(i, { serverId: id });
                                    }}>This server</button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div style={labelStyle}>Message</div>
                            <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} placeholder={"EU competitive Chill\n{link}"} value={rule.message} onChange={event => edit(i, { message: event.currentTarget.value })} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 12, color: duplicate ? "#f23f42" : undefined, opacity: duplicate ? 1 : 0.7 }}>
                                {duplicate ? "Duplicate command + server: only the first one is used." : rule.command ? `Registered as /${normalizeName(rule.command)}` : "Enter a command name"}
                            </div>
                            <button style={{ ...buttonStyle, background: "#da373c" }} onClick={() => remove(i)}>Delete</button>
                        </div>
                    </div>
                );
            })}
            <div><button style={buttonStyle} onClick={add}>+ Add command</button></div>
        </div>
    );
}

export default definePlugin({
    name: "userCommands",
    description: "Create your own slash commands (with per-server messages) from the plugin settings",
    authors: [{ name: "thcProphet", id: 828010614349365288n }],
    settings,
    start() { syncCommands(); },
    stop() { unregisterAll(); }
});

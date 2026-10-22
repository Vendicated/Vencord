/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Channel, Guild, MessageJSON, RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, Forms, Menu, Modal, openModal, Select, showToast, TextInput, UserStore, useState } from "@webpack/common";

type TriggerMode = "all" | "discord";
type PresetId = "alarm" | "chime" | "critical" | "doorbell" | "radar" | "soft" | "custom";

interface SoundRule {
    channelId: string;
    label: string;
    preset: PresetId;
    triggerMode: TriggerMode;
    volume: number;
    cooldownMs: number;
    customUrl?: string;
}

interface ToneStep {
    frequency: number;
    offset: number;
    duration: number;
    gain?: number;
    wave?: OscillatorType;
}

interface TargetItem {
    id: string;
    label: string;
}

const PRESETS: Record<Exclude<PresetId, "custom">, { label: string; description: string; steps: ToneStep[]; }> = {
    alarm: {
        label: "Alarm",
        description: "Three pulses for operational alerts",
        steps: [{ frequency: 880, offset: 0, duration: 0.16 }, { frequency: 660, offset: 0.2, duration: 0.16 }, { frequency: 880, offset: 0.4, duration: 0.28 }]
    },
    chime: {
        label: "Chime",
        description: "Two clear, harmonic notes",
        steps: [{ frequency: 659.25, offset: 0, duration: 0.22 }, { frequency: 987.77, offset: 0.16, duration: 0.4, gain: 0.8 }]
    },
    critical: {
        label: "Critical",
        description: "Short siren for urgent events",
        steps: [{ frequency: 1046.5, offset: 0, duration: 0.13, wave: "square" }, { frequency: 784, offset: 0.15, duration: 0.13, wave: "square" }, { frequency: 1046.5, offset: 0.3, duration: 0.13, wave: "square" }, { frequency: 784, offset: 0.45, duration: 0.22, wave: "square" }]
    },
    doorbell: {
        label: "Doorbell",
        description: "Ding-dong chime for direct messages",
        steps: [{ frequency: 783.99, offset: 0, duration: 0.35 }, { frequency: 523.25, offset: 0.32, duration: 0.55, gain: 0.85 }]
    },
    radar: {
        label: "Radar",
        description: "Subtle electronic pulse",
        steps: [{ frequency: 440, offset: 0, duration: 0.12, wave: "triangle" }, { frequency: 880, offset: 0.1, duration: 0.34, gain: 0.75, wave: "triangle" }]
    },
    soft: {
        label: "Soft",
        description: "Quiet note for active chats",
        steps: [{ frequency: 523.25, offset: 0, duration: 0.32, gain: 0.65 }, { frequency: 659.25, offset: 0.08, duration: 0.36, gain: 0.45 }]
    }
};

export const settings = definePluginSettings({
    rules: { type: OptionType.CUSTOM, default: {} as Record<string, SoundRule> },
    rulesManager: { type: OptionType.COMPONENT, component: RulesManager }
});

let audioContext: AudioContext | undefined;
const lastPlayedAt = new Map<string, number>();
const lastPlayedMessageIds = new Set<string>();

function unlockAudio() {
    try {
        audioContext ??= new AudioContext();
        if (audioContext.state === "suspended") {
            void audioContext.resume();
        }
    } catch {
        // ignore
    }
}

function channelLabel(channel: Channel): string {
    if (channel.name) return `#${channel.name}`;
    if (channel.rawRecipients?.length) {
        return channel.rawRecipients.map(u => u.global_name ?? u.username).join(", ");
    }
    return `Chat ${channel.id}`;
}

function saveRule(rule: SoundRule) {
    settings.store.rules = { ...settings.store.rules, [rule.channelId]: rule };
}

function removeRule(channelId: string) {
    const rules = { ...settings.store.rules };
    delete rules[channelId];
    settings.store.rules = rules;
    showToast({ text: "Custom sound removed.", variant: "success" });
}

function makeRule(target: TargetItem, preset: PresetId): SoundRule {
    const old = settings.store.rules[target.id];
    return {
        channelId: target.id,
        label: target.label,
        preset,
        triggerMode: old?.triggerMode ?? "discord",
        volume: old?.volume ?? 0.65,
        cooldownMs: old?.cooldownMs ?? 2000,
        customUrl: old?.customUrl
    };
}

function scheduleTone(context: AudioContext, step: ToneStep, startAt: number, volume: number) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const begin = startAt + step.offset;
    oscillator.type = step.wave ?? "sine";
    oscillator.frequency.setValueAtTime(step.frequency, begin);
    gain.gain.setValueAtTime(Math.max(volume * (step.gain ?? 1), 0.0001), begin);
    gain.gain.exponentialRampToValueAtTime(0.0001, begin + step.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(begin);
    oscillator.stop(begin + step.duration);
}

function isSafeAudioUrl(value: string) {
    if (!value || value.length > 2048) return false;
    try {
        return new URL(value).protocol === "https:";
    } catch {
        return false;
    }
}

async function playRule(rule: SoundRule, ignoreCooldown = false, messageId?: string) {
    if (messageId) {
        if (lastPlayedMessageIds.has(messageId)) return false;
        lastPlayedMessageIds.add(messageId);
        if (lastPlayedMessageIds.size > 200) {
            const first = lastPlayedMessageIds.values().next().value;
            if (first) lastPlayedMessageIds.delete(first);
        }
    }

    const now = Date.now();
    const targetKey = rule.channelId;
    const previous = lastPlayedAt.get(targetKey) ?? 0;
    const effectiveCooldown = Math.max(800, rule.cooldownMs);
    if (!ignoreCooldown && now - previous < effectiveCooldown) return false;
    lastPlayedAt.set(targetKey, now);

    const volume = Math.min(1, Math.max(0, rule.volume));
    if (rule.preset === "custom") {
        if (!rule.customUrl || !isSafeAudioUrl(rule.customUrl)) throw new Error("Custom audio URL must use HTTPS.");
        const audio = new Audio(rule.customUrl);
        audio.volume = volume;
        await audio.play();
        return true;
    }
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") {
        try {
            await audioContext.resume();
        } catch {
            // ignore
        }
    }
    const startAt = audioContext.currentTime;
    PRESETS[rule.preset].steps.forEach(step => scheduleTone(audioContext!, step, startAt, volume));
    return true;
}

async function testRule(rule: SoundRule) {
    try {
        await playRule(rule, true);
        showToast({ text: `Playing "${rule.preset === "custom" ? "Custom" : PRESETS[rule.preset].label}".`, variant: "success" });
    } catch (error) {
        showToast({ text: error instanceof Error ? error.message : "Failed to play sound.", variant: "critical" });
    }
}

function RuleModal({ modalProps, initialRule }: { modalProps: RenderModalProps; initialRule: SoundRule; }) {
    const [rule, setRule] = useState(initialRule);
    const customUrlValid = rule.preset !== "custom" || isSafeAudioUrl(rule.customUrl ?? "");
    return (
        <Modal
            {...modalProps}
            title={`Notification Sound — ${rule.label}`}
            subtitle="Configure and preview custom tones for this chat, channel, or server."
            actions={[
                { text: "Cancel", variant: "secondary", onClick: modalProps.onClose },
                {
                    text: "Save Rule",
                    variant: "primary",
                    disabled: !customUrlValid,
                    onClick: () => {
                        saveRule(rule);
                        modalProps.onClose();
                        showToast({ text: "Custom sound saved.", variant: "success" });
                    }
                }
            ]}
            notice={!customUrlValid ? { type: "critical", message: "Custom audio requires a valid HTTPS URL." } : undefined}
        >
            <Flex flexDirection="column" gap={16}>
                <section>
                    <Forms.FormTitle>Sound Preset</Forms.FormTitle>
                    <Select
                        options={[
                            ...Object.entries(PRESETS).map(([value, p]) => ({ label: `${p.label} — ${p.description}`, value: value as PresetId })),
                            { label: "Custom audio from URL", value: "custom" as PresetId }
                        ]}
                        isSelected={v => v === rule.preset}
                        select={preset => setRule({ ...rule, preset })}
                        serialize={v => v}
                    />
                </section>
                {rule.preset === "custom" && (
                    <section>
                        <Forms.FormTitle>HTTPS Audio URL</Forms.FormTitle>
                        <TextInput
                            value={rule.customUrl ?? ""}
                            placeholder="https://example.com/sound.mp3"
                            onChange={customUrl => setRule({ ...rule, customUrl })}
                        />
                    </section>
                )}
                <section>
                    <Forms.FormTitle>Trigger Condition</Forms.FormTitle>
                    <Select
                        options={[
                            { label: "Only when Discord would notify", value: "discord" as TriggerMode },
                            { label: "On all incoming messages", value: "all" as TriggerMode }
                        ]}
                        isSelected={v => v === rule.triggerMode}
                        select={triggerMode => setRule({ ...rule, triggerMode })}
                        serialize={v => v}
                    />
                </section>
                <section>
                    <Forms.FormTitle>Volume — {Math.round(rule.volume * 100)}%</Forms.FormTitle>
                    <input
                        className="vc-cns-range"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={rule.volume}
                        onChange={e => setRule({ ...rule, volume: Number(e.currentTarget.value) })}
                    />
                </section>
                <Button variant="secondary" onClick={() => void testRule(rule)}>Preview Sound</Button>
            </Flex>
        </Modal>
    );
}

function openRuleModal(rule: SoundRule) {
    openModal(modalProps => <RuleModal modalProps={modalProps} initialRule={rule} />);
}

function RulesManager() {
    const { rules } = settings.use(["rules"]);
    const list = Object.values(rules ?? {});
    return (
        <section className="vc-cns-manager">
            <Forms.FormTitle>Configured Notification Sounds</Forms.FormTitle>
            <Paragraph>Assign sounds by right-clicking any channel, DM, group, or server icon.</Paragraph>
            <Flex flexDirection="column" gap={8}>
                {list.length === 0 && <Card className="vc-cns-empty">No custom sounds configured yet.</Card>}
                {list.map(rule => (
                    <Card key={rule.channelId} className="vc-cns-rule">
                        <div className="vc-cns-rule-copy">
                            <strong>{rule.label}</strong>
                            <span>{rule.preset === "custom" ? "Custom" : PRESETS[rule.preset].label} • {Math.round(rule.volume * 100)}% • {rule.triggerMode === "all" ? "all messages" : "discord notifications"}</span>
                        </div>
                        <Button variant="secondary" size="small" onClick={() => void testRule(rule)}>Test</Button>
                        <Button variant="secondary" size="small" onClick={() => openRuleModal(rule)}>Edit</Button>
                        <Button variant="dangerSecondary" size="iconOnly" onClick={() => removeRule(rule.channelId)}>
                            <DeleteIcon aria-label="Remove rule" width={18} height={18} />
                        </Button>
                    </Card>
                ))}
            </Flex>
        </section>
    );
}

function insertMenuItem(children: any, item: any, childIds: string[]) {
    const group = findGroupChildrenByChildId(childIds, children);
    if (group && Array.isArray(group)) {
        group.push(item);
        return;
    }
    if (Array.isArray(children)) {
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (child && child.props && Array.isArray(child.props.children)) {
                child.props.children.push(item);
                return;
            }
        }
        children.push(<Menu.MenuGroup>{item}</Menu.MenuGroup>);
    }
}

function buildSoundContextMenu(target: TargetItem) {
    const existing = settings.store.rules?.[target.id];
    return (
        <Menu.MenuItem id="vc-cns-menu" label="Notification Sound">
            {Object.entries(PRESETS).map(([preset, data]) => {
                const isSelected = existing?.preset === preset;
                return (
                    <Menu.MenuItem
                        id={`vc-cns-${preset}`}
                        key={preset}
                        label={isSelected ? `${data.label} (Active)` : data.label}
                        action={() => {
                            const rule = makeRule(target, preset as PresetId);
                            saveRule(rule);
                            void testRule(rule);
                        }}
                    />
                );
            })}
            <Menu.MenuSeparator />
            <Menu.MenuItem
                id="vc-cns-configure"
                label="Configure & Preview…"
                action={() => openRuleModal(existing ?? makeRule(target, "chime"))}
            />
            {existing && (
                <Menu.MenuItem
                    id="vc-cns-remove"
                    label="Remove Custom Sound"
                    color="danger"
                    action={() => removeRule(target.id)}
                />
            )}
        </Menu.MenuItem>
    );
}

const patchChannelContextMenu: NavContextMenuPatchCallback = (children, { channel }: { channel?: Channel; }) => {
    if (!channel?.id) return;
    const label = channelLabel(channel);
    const target: TargetItem = { id: channel.id, label };
    const item = buildSoundContextMenu(target);
    insertMenuItem(children, item, [
        "channel-settings",
        "edit-channel",
        "notifications",
        "mute-channel",
        "unmute-channel",
        "change-icon",
        "close-dm",
        "leave-channel"
    ]);
};

const patchGuildContextMenu: NavContextMenuPatchCallback = (children, { guild }: { guild?: Guild; }) => {
    if (!guild?.id) return;
    const label = guild.name ? `Server ${guild.name}` : `Server ${guild.id}`;
    const target: TargetItem = { id: guild.id, label };
    const item = buildSoundContextMenu(target);
    insertMenuItem(children, item, [
        "guild-settings",
        "notifications",
        "mute-guild",
        "unmute-guild",
        "privacy"
    ]);
};

export default definePlugin({
    name: "ChannelNotificationSounds",
    description: "Assign distinct notification sounds to specific channels, DMs, groups, and servers",
    authors: [Devs.AndersonPGS],
    settings,
    patches: [
        {
            find: '"NotificationStore"',
            replacement: [
                {
                    match: /sound:([^\n,]+)(?=,volume:\i,onClick)/,
                    replace: "sound:$self.handleNotificationSound(arguments[0]?.message,$1)"
                }
            ]
        }
    ],
    contextMenus: {
        "channel-context": patchChannelContextMenu,
        "thread-context": patchChannelContextMenu,
        "user-context": patchChannelContextMenu,
        "gdm-context": patchChannelContextMenu,
        "guild-context": patchGuildContextMenu,
        "guild-header-popout": patchGuildContextMenu
    },
    start() {
        unlockAudio();
        window.addEventListener("click", unlockAudio, { once: true, passive: true });
        window.addEventListener("keydown", unlockAudio, { once: true, passive: true });
    },
    handleNotificationSound(message: MessageJSON | undefined, defaultSound: any) {
        if (!message?.channel_id) return defaultSound;
        const channel = ChannelStore.getChannel(message.channel_id);
        const guildId = channel?.guild_id;
        const rule = settings.store.rules?.[message.channel_id] ?? (guildId ? settings.store.rules?.[guildId] : undefined);
        if (!rule) return defaultSound;

        if (rule.triggerMode === "discord") {
            if (!defaultSound) return defaultSound;
            void playRule(rule, false, message.id).catch(error => console.error("[ChannelNotificationSounds]", error));
            return void 0;
        }

        return void 0;
    },
    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: MessageJSON; optimistic: boolean; }) {
            if (optimistic) return;
            const currentUserId = UserStore.getCurrentUser()?.id;
            if (currentUserId && message.author?.id === currentUserId) return;

            const channel = ChannelStore.getChannel(message.channel_id);
            const guildId = channel?.guild_id;
            const rule = settings.store.rules?.[message.channel_id] ?? (guildId ? settings.store.rules?.[guildId] : undefined);
            if (!rule) return;

            if (rule.triggerMode === "all") {
                void playRule(rule, false, message.id).catch(error => console.error("[ChannelNotificationSounds]", error));
            }
        }
    },
    stop() {
        void audioContext?.close();
        audioContext = undefined;
        lastPlayedAt.clear();
        lastPlayedMessageIds.clear();
    }
});

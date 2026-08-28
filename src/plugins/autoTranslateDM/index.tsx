/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { updateMessage } from "@api/MessageUpdater";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Menu, MessageStore, useEffect,UserStore } from "@webpack/common";

type RuleThing = {
    target: string;
};

type GoogleThing = {
    sourceLanguage: string;
    translation: string;
};

type MsgThing = Message & {
    vcAutoTranslated?: boolean;
    vcAutoSource?: string;
    vcAutoRendered?: string;
    vcAutoTarget?: string;
    vcAutoMyOriginal?: string;
};

const langs = [
    { label: "English", value: "en" },
    { label: "Spanish", value: "es" },
    { label: "French", value: "fr" },
    { label: "German", value: "de" },
    { label: "Italian", value: "it" },
    { label: "Portuguese", value: "pt" },
    { label: "Dutch", value: "nl" },
    { label: "Polish", value: "pl" },
    { label: "Russian", value: "ru" },
    { label: "Ukrainian", value: "uk" },
    { label: "Turkish", value: "tr" },
    { label: "Arabic", value: "ar" },
    { label: "Hindi", value: "hi" },
    { label: "Bengali", value: "bn" },
    { label: "Urdu", value: "ur" },
    { label: "Chinese (Simplified)", value: "zh-CN" },
    { label: "Chinese (Traditional)", value: "zh-TW" },
    { label: "Japanese", value: "ja" },
    { label: "Korean", value: "ko" },
    { label: "Vietnamese", value: "vi" },
    { label: "Thai", value: "th" },
    { label: "Indonesian", value: "id" },
    { label: "Swedish", value: "sv" },
    { label: "Norwegian", value: "no" },
    { label: "Danish", value: "da" },
    { label: "Finnish", value: "fi" },
    { label: "Greek", value: "el" },
    { label: "Hebrew", value: "he" },
    { label: "Romanian", value: "ro" },
    { label: "Czech", value: "cs" },
    { label: "Hungarian", value: "hu" }
] as const;

const tinyNames: Record<string, string> = {
    en: "EN", es: "SP", fr: "FR", de: "DE", it: "IT", pt: "PT",
    nl: "NL", pl: "PL", ru: "RU", uk: "UA", tr: "TR", ar: "AR",
    hi: "HI", bn: "BN", ur: "UR", "zh-cn": "CN", "zh-tw": "TW",
    ja: "JP", ko: "KR", vi: "VI", th: "TH", id: "ID", sv: "SV",
    no: "NO", da: "DA", fi: "FI", el: "EL", he: "HE", ro: "RO",
    cs: "CS", hu: "HU"
};

const settings = definePluginSettings({
    autoIncoming: {
        type: OptionType.BOOLEAN,
        description: "Master switch for incoming translation. Enable it per DM/channel from the context menu.",
        default: true
    },
    incomingTarget: {
        type: OptionType.SELECT,
        description: "Translate incoming messages into",
        options: langs.map((l, i) => ({ ...l, default: i === 0 }))
    },
    dmRulesJson: {
        type: OptionType.STRING,
        description: "Stored per-DM/per-channel outgoing translation rules",
        default: "{}",
        hidden: true
    },
    incomingChannelsJson: {
        type: OptionType.STRING,
        description: "Stored per-DM/per-channel incoming translation toggles",
        default: "{}",
        hidden: true
    }
});

function langName(code: string) {
    return langs.find(l => l.value.toLowerCase() === code.toLowerCase())?.label ?? code;
}

function tinyName(code: string) {
    return tinyNames[code.toLowerCase()] ?? code.slice(0, 2).toUpperCase();
}

function norm(code: string) {
    return code.toLowerCase().split("-")[0];
}

function grabRules(): Record<string, RuleThing> {
    try {
        const parsed = JSON.parse(settings.store.dmRulesJson || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function grabRule(channelId: string) {
    return grabRules()[channelId];
}

function incomingChannels(): Record<string, boolean> {
    try {
        const parsed = JSON.parse(settings.store.incomingChannelsJson || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function incomingOn(channelId: string) {
    return incomingChannels()[channelId] === true;
}

function setIncoming(channelId: string, enabled: boolean) {
    const channels = incomingChannels();

    if (enabled) channels[channelId] = true;
    else delete channels[channelId];

    settings.store.incomingChannelsJson = JSON.stringify(channels);
    doBadges();

    if (enabled) window.setTimeout(() => scanChannel(channelId), 50);
    else restoreChannel(channelId);
}

function setThing(channelId: string, target: string | null) {
    const rules = grabRules();

    if (target) rules[channelId] = { target };
    else delete rules[channelId];

    settings.store.dmRulesJson = JSON.stringify(rules);
    doBadges();
}

function isJunk(text: string) {
    const t = text.trim();
    if (!t) return true;
    if (/^https?:\/\/\S+$/i.test(t)) return true;
    if (/^```[\s\S]*```$/.test(t)) return true;
    return !/\p{L}/u.test(t);
}

function tooShortToTrust(text: string) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1 && words[0].length <= 5) return true;

    const shortStuff = new Set([
        "wow", "lol", "lmao", "lmfao", "ok", "okay", "yeah", "yea", "yep",
        "nah", "nope", "bro", "bruh", "dude", "fr", "bet", "real", "true",
        "nice", "cool", "hey", "hi", "hello", "bye", "thanks", "thx", "wtf",
        "omg", "idk", "imo", "tbh", "sure"
    ]);

    return words.length <= 2 && shortStuff.has(text.trim().toLowerCase());
}

async function doGoogle(text: string, target: string, source = "auto"): Promise<GoogleThing> {
    const url = "https://translate-pa.googleapis.com/v1/translate?" + new URLSearchParams({
        "params.client": "gtx",
        "dataTypes": "TRANSLATION",
        "key": "AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA",
        "query.sourceLanguage": source,
        "query.targetLanguage": target,
        "query.text": text
    });

    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Translation failed: ${response.status}`);

    return await response.json();
}

const stash = new Map<string, Promise<GoogleThing>>();
const busy = new Set<string>();
const oldStuff = new Map<string, { channelId: string; content: string; }>();
const myPending = new Map<string, { original: string; translated: string; time: number; }[]>();

function doCached(messageId: string, text: string, target: string) {
    const key = `${messageId}:${target}:${text}`;
    let result = stash.get(key);

    if (!result) {
        result = doGoogle(text, target);
        stash.set(key, result);
        result.catch(() => stash.delete(key));

        if (stash.size > 500) {
            const first = stash.keys().next().value;
            if (first) stash.delete(first);
        }
    }

    return result;
}

function makeText(sourceLanguage: string, translation: string) {
    return `-# *(translated from ${langName(sourceLanguage)})*\n${translation}`;
}

function showWhatISaid(message: MsgThing) {
    if (message.author?.id !== UserStore.getCurrentUser()?.id) return;
    if (message.vcAutoMyOriginal) return;

    const list = myPending.get(message.channel_id);
    if (!list?.length) return;

    const now = Date.now();
    while (list.length && now - list[0].time > 30000) list.shift();
    if (!list.length) {
        myPending.delete(message.channel_id);
        return;
    }

    const i = list.findIndex(x => x.translated.trim() === message.content.trim());
    if (i === -1) return;

    const found = list.splice(i, 1)[0];
    if (!list.length) myPending.delete(message.channel_id);

    const rendered = `${message.content}\n-# *(you said: ${found.original})*`;

    updateMessage(message.channel_id, message.id, {
        content: rendered,
        vcAutoMyOriginal: found.original
    } as any);
}

async function doIncoming(message: MsgThing) {
    if (!settings.store.autoIncoming) return;
    if (!message?.id || !message.channel_id) return;
    if (!incomingOn(message.channel_id)) return;
    if (message.author?.id === UserStore.getCurrentUser()?.id) return;

    const target = settings.store.incomingTarget;
    if (
        message.vcAutoTranslated
        && message.vcAutoTarget === target
        && message.content === message.vcAutoRendered
    ) return;
    const sourceText = (
        message.vcAutoTranslated && message.content !== message.vcAutoRendered
            ? message.content
            : message.vcAutoSource ?? message.content
    )?.trim() ?? "";

    if (!sourceText || isJunk(sourceText) || tooShortToTrust(sourceText)) return;

    const flightKey = `${message.id}:${target}:${sourceText}`;
    if (busy.has(flightKey)) return;
    busy.add(flightKey);

    try {
        const got = await doCached(message.id, sourceText, target);

        if (norm(got.sourceLanguage) === norm(target))
            return;

        if (got.translation.trim().toLowerCase() === sourceText.toLowerCase())
            return;

        const cooked = makeText(got.sourceLanguage, got.translation);

        if (!oldStuff.has(message.id)) {
            oldStuff.set(message.id, {
                channelId: message.channel_id,
                content: sourceText
            });
        }

        updateMessage(message.channel_id, message.id, {
            content: cooked,
            vcAutoTranslated: true,
            vcAutoSource: sourceText,
            vcAutoRendered: cooked,
            vcAutoTarget: target
        } as any);
    } catch (err) {
        console.error("[AutoTranslateDM]", err);
    } finally {
        busy.delete(flightKey);
    }
}

function LilWorker({ message }: { message: Message; }) {
    useEffect(() => {
        void doIncoming(message as MsgThing);
    }, [message.id, message.content, settings.store.autoIncoming, settings.store.incomingTarget]);
    return null;
}

function scanChannel(channelId: string) {
    const messages = MessageStore.getMessages(channelId);
    if (!messages) return;

    messages.forEach(message => {
        void doIncoming(message as MsgThing);
    });
}

function restoreChannel(channelId: string) {
    for (const [messageId, original] of oldStuff) {
        if (original.channelId !== channelId) continue;

        updateMessage(original.channelId, messageId, {
            content: original.content,
            vcAutoTranslated: false,
            vcAutoSource: undefined,
            vcAutoRendered: undefined,
            vcAutoTarget: undefined
        } as any);

        oldStuff.delete(messageId);
    }
}

function makeMenu(channelId: string) {
    const thing = grabRule(channelId);
    const incoming = incomingOn(channelId);

    return (
        <>
            <Menu.MenuItem
                id="vc-auto-translate-incoming"
                label={`Translate Incoming Messages: ${incoming ? "On" : "Off"}`}
                action={() => setIncoming(channelId, !incoming)}
            />

            <Menu.MenuItem
                id="vc-auto-translate-my-messages"
            label={thing
                ? `Auto Translate My Messages → ${langName(thing.target)}`
                : "Auto Translate My Messages"}
        >
            <Menu.MenuItem
                id="vc-auto-translate-my-messages-off"
                label={`${!thing ? "✓ " : ""}Off`}
                action={() => setThing(channelId, null)}
            />

            <Menu.MenuSeparator />

            {langs.map(lang => (
                <Menu.MenuItem
                    id={`vc-auto-translate-my-messages-${lang.value}`}
                    key={lang.value}
                    label={`${thing?.target === lang.value ? "✓ " : ""}${lang.label}`}
                    action={() => setThing(channelId, lang.value)}
                />
            ))}
            </Menu.MenuItem>
        </>
    );
}

const msgMenu: NavContextMenuPatchCallback = (children, props: any) => {
    const channelId = props.message?.channel_id;
    if (!channelId) return;

    const group = findGroupChildrenByChildId("copy-text", children) ?? children;
    group.splice(0, 0, makeMenu(channelId));
};

const chanMenu: NavContextMenuPatchCallback = (children, props: any) => {
    const channelId = props.channel?.id;
    if (!channelId) return;

    const group = findGroupChildrenByChildId(["mute-channel", "unmute-channel"], children)
        ?? findGroupChildrenByChildId("mark-channel-read", children)
        ?? children;

    group.push(makeMenu(channelId));
};

const badgeClass = "vc-auto-translate-badge";
let badgeClock: number | undefined;

function findLink(channelId: string) {
    return document.querySelector<HTMLElement>(
        `a[href="/channels/@me/${channelId}"], a[href^="/channels/"][href$="/${channelId}"]`
    );
}

function doBadges() {
    const rules = grabRules();
    const incoming = incomingChannels();

    document.querySelectorAll<HTMLElement>(`.${badgeClass}`).forEach(el => {
        const id = el.dataset.channelId;
        const kind = el.dataset.badgeKind;

        if (!id) {
            el.remove();
            return;
        }

        if (kind === "outgoing" && !rules[id]) el.remove();
        if (kind === "incoming" && !incoming[id]) el.remove();
    });

    const addBadge = (channelId: string, kind: "outgoing" | "incoming", text: string, title: string) => {
        const existing = document.querySelector<HTMLElement>(
            `.${badgeClass}[data-channel-id="${channelId}"][data-badge-kind="${kind}"]`
        );

        if (existing) {
            existing.textContent = text;
            existing.title = title;
            return;
        }

        const link = findLink(channelId);
        if (!link) return;

        const badge = document.createElement("span");
        badge.className = badgeClass;
        badge.dataset.channelId = channelId;
        badge.dataset.badgeKind = kind;
        badge.textContent = text;
        badge.title = title;

        Object.assign(badge.style, {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "20px",
            height: "15px",
            padding: "0 4px",
            marginLeft: "6px",
            borderRadius: "5px",
            fontSize: "9px",
            fontWeight: "700",
            lineHeight: "15px",
            color: "var(--text-normal)",
            background: "var(--background-modifier-selected)",
            border: "1px solid var(--background-modifier-accent)",
            pointerEvents: "none",
            flexShrink: "0"
        });

        const other = link.querySelector<HTMLElement>(
            `.${badgeClass}[data-channel-id="${channelId}"]`
        );

        if (other) {
            other.insertAdjacentElement("afterend", badge);
            return;
        }

        const candidates = Array.from(link.querySelectorAll<HTMLElement>("span, div"))
            .filter(el => {
                const value = el.textContent?.trim();
                if (!value || el.querySelector("img, svg")) return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 5 && rect.height > 8 && rect.height < 40;
            });

        const name = candidates[0];

        if (name) name.insertAdjacentElement("afterend", badge);
        else link.appendChild(badge);
    };

    for (const [channelId, rule] of Object.entries(rules)) {
        addBadge(
            channelId,
            "outgoing",
            tinyName(rule.target),
            `My messages translate to ${langName(rule.target)}`
        );
    }

    for (const channelId of Object.keys(incoming)) {
        if (!incoming[channelId]) continue;
        addBadge(channelId, "incoming", "Translate: ON", "Incoming messages auto-translate");
    }
}
function startBadges() {
    doBadges();
    if (badgeClock !== undefined) clearInterval(badgeClock);
    badgeClock = window.setInterval(doBadges, 1200);
}

function stopBadges() {
    if (badgeClock !== undefined) {
        clearInterval(badgeClock);
        badgeClock = undefined;
    }

    document.querySelectorAll(`.${badgeClass}`).forEach(el => el.remove());
}

export default definePlugin({
    name: "AutoTranslateDM",
    description: "Automatically translates incoming messages and can translate your messages per DM or channel.",
    authors: [Devs.en],
    dependencies: ["MessageUpdaterAPI", "MessageAccessoriesAPI"],
    settings,

    contextMenus: {
        message: msgMenu,
        "channel-context": chanMenu,
        "thread-context": chanMenu,
        "gdm-context": chanMenu
    },

    start() {
        startBadges();

        window.setTimeout(() => {
            const channelId = document.location.pathname.split("/").at(-1);
            if (channelId) scanChannel(channelId);
        }, 500);
    },

    stop() {
        stopBadges();
        for (const [messageId, original] of oldStuff) {
            updateMessage(original.channelId, messageId, {
                content: original.content,
                vcAutoTranslated: false,
                vcAutoSource: undefined,
                vcAutoRendered: undefined,
                vcAutoTarget: undefined
            } as any);
        }

        oldStuff.clear();
        busy.clear();
        myPending.clear();
    },

    flux: {
        MESSAGE_CREATE({ message }: { message: Message; }) {
            showWhatISaid(message as MsgThing);
            void doIncoming(message as MsgThing);
        },

        MESSAGE_UPDATE({ message }: { message: Message; }) {
            void doIncoming(message as MsgThing);
        },

        CHANNEL_SELECT({ channelId }: { channelId: string; }) {
            window.setTimeout(() => scanChannel(channelId), 100);
        }
    },

    renderMessageAccessory: props => (
        <LilWorker message={props.message} />
    ),

    async onBeforeMessageSend(channelId, message) {
        if (!message.content?.trim()) return;

        const rule = grabRule(channelId);
        if (!rule) return;

        try {
            const got = await doGoogle(message.content, rule.target);

            if (norm(got.sourceLanguage) === norm(rule.target))
                return;

            const original = message.content;
            const list = myPending.get(channelId) ?? [];
            list.push({
                original,
                translated: got.translation,
                time: Date.now()
            });
            myPending.set(channelId, list);

            message.content = got.translation;
        } catch (err) {
            console.error("[AutoTranslateDM] outgoing translation failed", err);
            return true;
        }
    }
});


/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ParsedQuery } from "./types";

function normalizeSpaces(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

function normalizeLocaleToken(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[.'’]/g, "")
        .replace(/\s+/g, " ");
}

const SEND_TO_PREFIXES = [
    "send to ",
    "enviar a ",
    "senden an ",
    "invia a ",
    "envoyer a ",
    "enviar para ",
    "отправить в "
];

function extractSendFlags(content: string): { content: string; useFilePicker: boolean; silent: boolean; } {
    const useFilePicker = /\[file\]/i.test(content);
    const silent = /(^|\s)--silent(\s|$)/i.test(content);
    const cleaned = content
        .replace(/\[file\]/ig, " ")
        .replace(/(^|\s)--silent(\s|$)/ig, " ")
        .trim();

    return { content: cleaned, useFilePicker, silent };
}

function sanitizeTargetToken(target: string): string {
    return target.trim().replace(/[,:;]+$/, "");
}

function parseSendBody(raw: string): ParsedQuery | null {
    const body = normalizeSpaces(raw);
    if (!body) return null;

    const parts = body.split(" ");
    const target = sanitizeTargetToken(parts[0] ?? "");
    const contentRaw = parts.slice(1).join(" ").trim();
    const { content, useFilePicker, silent } = extractSendFlags(contentRaw);
    if (!target) return null;

    return {
        raw,
        intent: "send_message",
        target,
        content,
        useFilePicker,
        silent
    };
}

function parseSendChannel(raw: string): ParsedQuery | null {
    const normalized = normalizeSpaces(raw);
    const normalizedLocale = normalizeLocaleToken(normalized);
    const prefix = SEND_TO_PREFIXES.find(candidate => normalizedLocale.startsWith(candidate));
    if (!prefix) return null;

    const body = normalized.slice(prefix.length).trim();
    if (!body) return null;

    const parts = body.split(" ");
    if (parts.length < 2) return null;

    const target = sanitizeTargetToken(parts[0] ?? "");
    const contentRaw = parts.slice(1).join(" ").trim();
    const { content, useFilePicker, silent } = extractSendFlags(contentRaw);
    if (!target || !content) return null;

    return {
        raw,
        intent: "send_channel",
        target,
        content,
        useFilePicker,
        silent
    };
}

const SEND_PREFIXES = [
    "send message to ",
    "send dm to ",
    "send message ",
    "send dm ",
    "message ",
    "tell ",
    "whisper ",
    "pm ",
    "msg ",
    "dm ",
    "send ",
    "enviar mensaje a ",
    "enviar md a ",
    "enviar mensaje ",
    "enviar md ",
    "mensaje ",
    "decir ",
    "susurrar ",
    "md ",
    "enviar ",
    "envoyer message a ",
    "envoyer mp a ",
    "envoyer message ",
    "message ",
    "chuchoter ",
    "mp ",
    "envoyer ",
    "nachricht an ",
    "senden ",
    "dm an ",
    "dm ",
    "invia messaggio a ",
    "invia ",
    "messaggio ",
    "manda ",
    "enviar mensagem para ",
    "enviar dm para ",
    "mensagem ",
    "falar ",
    "отправить сообщение ",
    "отправить "
];

function parseSemanticSend(raw: string): ParsedQuery | null {
    const normalized = normalizeLocaleToken(raw);
    const prefix = SEND_PREFIXES.find(candidate => normalized.startsWith(candidate));
    if (!prefix) return null;
    const body = raw.slice(prefix.length).trim();
    return parseSendBody(body);
}

export function parseQuery(rawQuery: string): ParsedQuery | null {
    const raw = normalizeSpaces(rawQuery);
    const lower = raw.toLowerCase();
    const normalizedLocale = normalizeLocaleToken(raw);
    if (!raw) return null;

    if (SEND_TO_PREFIXES.some(prefix => normalizedLocale.startsWith(prefix))) {
        return parseSendChannel(raw);
    }

    if (lower.startsWith("send now ")) {
        const target = raw.slice(9).trim();
        return { raw, intent: "send_scheduled_now", target };
    }

    if (lower.startsWith("cancel scheduled ")) {
        const target = raw.slice(17).trim();
        return { raw, intent: "cancel_scheduled_message", target };
    }

    if (lower.startsWith("reschedule ")) {
        const target = raw.slice(11).trim();
        return { raw, intent: "reschedule_message", target };
    }

    if (lower.startsWith("schedule ")) {
        const target = raw.slice(9).trim();
        return { raw, intent: "schedule_message", target };
    }

    const semanticSend = parseSemanticSend(raw);
    if (semanticSend) return semanticSend;

    if (lower.startsWith("open dm ")) {
        const target = raw.slice(8).trim();
        if (!target) return null;
        return { raw, intent: "open_dm", target };
    }

    if (lower.startsWith("open dms ")) {
        const target = raw.slice(9).trim();
        if (!target) return null;
        return { raw, intent: "open_dm", target };
    }

    if (lower === "open dm" || lower === "open dms") {
        return { raw, intent: "open_dm", target: "" };
    }

    if (lower.startsWith("go to ")) {
        const target = raw.slice(6).trim();
        if (!target) return null;
        return { raw, intent: "go_to", target };
    }

    if (lower === "go to") {
        return { raw, intent: "go_to", target: "" };
    }

    if (lower.startsWith("open settings ")) {
        const target = raw.slice(14).trim();
        if (!target) return null;
        return { raw, intent: "open_settings", target };
    }

    if (lower.startsWith("toggle plugin ")) {
        const target = raw.slice(14).trim();
        if (!target) return null;
        return { raw, intent: "toggle_plugin", target };
    }

    if (lower.startsWith("open url ")) {
        const target = raw.slice(9).trim();
        if (!target) return null;
        return { raw, intent: "open_url", target };
    }

    if (lower.startsWith("create notebook ")) {
        const target = raw.slice(16).trim();
        return { raw, intent: "create_notebook", target };
    }

    if (lower.startsWith("delete notebook ")) {
        const target = raw.slice(16).trim();
        return { raw, intent: "delete_notebook", target };
    }

    if (lower.startsWith("move note ")) {
        const target = raw.slice(10).trim();
        return { raw, intent: "move_note", target };
    }

    if (lower.startsWith("jump to note ")) {
        const target = raw.slice(13).trim();
        return { raw, intent: "jump_note", target };
    }

    return null;
}

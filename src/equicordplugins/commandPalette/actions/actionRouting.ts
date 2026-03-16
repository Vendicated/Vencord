/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ActionRoutingIntent {
    type: string;
    actionKey?: string;
}

export interface ActionRoutingAction {
    id: string;
    shortcut: string;
    intent: ActionRoutingIntent;
}

export type ActionMatchSource = "intent-action-key" | "shortcut" | "id";

export interface ResolvedActionByKey<TAction extends ActionRoutingAction> {
    action: TAction;
    matchSource: ActionMatchSource;
    normalizedActionKey: string;
}

const actionKeyNormalizationOrder = new Map([
    ["meta", 0],
    ["alt", 1],
    ["ctrl", 2],
    ["shift", 3],
    ["enter", 4],
    ["left", 5],
    ["right", 6],
    ["up", 7],
    ["down", 8],
    ["esc", 9],
    ["tab", 10],
    ["space", 11]
]);

const shortcutSymbolTokenMap = new Map<string, string>([
    ["⌘", "meta"],
    ["⌥", "alt"],
    ["⌃", "ctrl"],
    ["⇧", "shift"],
    ["↵", "enter"],
    ["←", "left"],
    ["→", "right"],
    ["↑", "up"],
    ["↓", "down"]
]);

function normalizeShortcutToken(token: string): string {
    const normalized = token.trim().toLowerCase();
    if (!normalized) return "";
    if (normalized === "cmd" || normalized === "command" || normalized === "meta" || normalized === "⌘") return "meta";
    if (normalized === "alt" || normalized === "option" || normalized === "⌥") return "alt";
    if (normalized === "ctrl" || normalized === "control" || normalized === "^" || normalized === "⌃") return "ctrl";
    if (normalized === "shift" || normalized === "⇧") return "shift";
    if (normalized === "enter" || normalized === "return" || normalized === "↵") return "enter";
    if (normalized === "left" || normalized === "←") return "left";
    if (normalized === "right" || normalized === "→") return "right";
    if (normalized === "up" || normalized === "↑") return "up";
    if (normalized === "down" || normalized === "↓") return "down";
    if (normalized === "escape" || normalized === "esc") return "esc";
    if (normalized === "tab" || normalized === "⇥") return "tab";
    if (normalized === "space" || normalized === "spacebar") return "space";
    return normalized;
}

function tokenizeActionKey(value: string): string[] {
    let expanded = "";
    for (const char of value) {
        const token = shortcutSymbolTokenMap.get(char);
        expanded += token ? `+${token}+` : char;
    }

    return expanded
        .split(/[+\s]+/)
        .map(normalizeShortcutToken)
        .filter(Boolean);
}

export function normalizeActionKey(value: string): string {
    const tokenSet = new Set(tokenizeActionKey(value));
    return Array.from(tokenSet).sort((left, right) => {
        const leftOrder = actionKeyNormalizationOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = actionKeyNormalizationOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.localeCompare(right);
    }).join("+");
}

export function resolveActionByActionKey<TAction extends ActionRoutingAction>(
    actions: readonly TAction[] | undefined,
    actionKey: string
): ResolvedActionByKey<TAction> | null {
    if (!actions || actions.length === 0) return null;
    const normalizedActionKey = normalizeActionKey(actionKey);
    if (!normalizedActionKey) return null;

    for (const action of actions) {
        if (action.intent.type !== "execute-secondary" || !action.intent.actionKey) continue;
        const normalizedIntentActionKey = normalizeActionKey(action.intent.actionKey);
        if (normalizedIntentActionKey && normalizedIntentActionKey === normalizedActionKey) {
            return {
                action,
                matchSource: "intent-action-key",
                normalizedActionKey
            };
        }
    }

    for (const action of actions) {
        const normalizedShortcut = normalizeActionKey(action.shortcut);
        if (normalizedShortcut && normalizedShortcut === normalizedActionKey) {
            return {
                action,
                matchSource: "shortcut",
                normalizedActionKey
            };
        }
    }

    for (const action of actions) {
        const normalizedId = normalizeActionKey(action.id);
        if (normalizedId && normalizedId === normalizedActionKey) {
            return {
                action,
                matchSource: "id",
                normalizedActionKey
            };
        }
    }

    return null;
}

export function resolveActionIntentByActionKey<TAction extends ActionRoutingAction>(
    actions: readonly TAction[] | undefined,
    actionKey: string
): ActionRoutingIntent | null {
    if (actionKey === "primary") {
        return { type: "execute-primary" };
    }

    const resolved = resolveActionByActionKey(actions, actionKey);
    if (!resolved) return null;

    if (resolved.action.intent.type === "execute-primary" || resolved.action.intent.type === "execute-secondary") {
        const resolvedActionKey = resolved.matchSource === "intent-action-key" && resolved.action.intent.actionKey
            ? normalizeActionKey(resolved.action.intent.actionKey)
            : resolved.normalizedActionKey;
        return { type: "execute-secondary", actionKey: resolvedActionKey };
    }

    return resolved.action.intent;
}

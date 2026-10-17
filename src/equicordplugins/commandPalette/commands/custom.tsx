/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { insertTextIntoChatInputBox } from "@utils/discord";
import { parseUrl } from "@utils/misc";
import { showToast } from "@webpack/common";

import { registerCommands } from "../api/registry";
import type { FormPageSpec, PageEntry, PaletteAction, PaletteCommand } from "../api/types";
import { filterOptions } from "../search/ranker";
import { createPersistedValue } from "../state/persist";
import { BoltIcon, GearIcon, LinkIcon, PencilIcon, PlusIcon, TextIcon, TrashIcon } from "../ui/icons";
import { DISCORD_SETTINGS_ROUTES, openSettingsPage } from "./openSettings";

type CustomCommandKind = "url" | "settings" | "message";

interface CustomCommandData {
    id: string;
    name: string;
    kind: CustomCommandKind;
    value: string;
}

const OWNER = "CommandPalette.custom";
const store = createPersistedValue<CustomCommandData[]>("customCommands", []);

const KIND_OPTIONS = [
    { value: "url", label: "Open URL", icon: LinkIcon },
    { value: "settings", label: "Open Settings Page", icon: GearIcon },
    { value: "message", label: "Insert Text in Chat", icon: TextIcon }
];

const KIND_ICONS: Record<CustomCommandKind, PaletteCommand["icon"]> = {
    url: LinkIcon,
    settings: GearIcon,
    message: TextIcon
};

function runCustomCommand(data: CustomCommandData) {
    switch (data.kind) {
        case "url":
            VencordNative.native.openExternal(data.value);
            break;
        case "settings":
            void openSettingsPage(data.value);
            break;
        case "message":
            insertTextIntoChatInputBox(data.value);
            break;
    }
}

function commandForm(existing: CustomCommandData | null): PageEntry {
    const spec: FormPageSpec = {
        type: "form",
        submitLabel: existing ? "Save Command" : "Create Command",
        fields: [
            { key: "name", label: "Name", type: "text", placeholder: "Command name", initial: existing?.name ?? "" },
            { key: "kind", label: "Action", type: "select", options: KIND_OPTIONS, initial: existing?.kind ?? "url" },
            {
                key: "url",
                label: "URL",
                type: "text",
                placeholder: "https://example.com",
                initial: existing?.kind === "url" ? existing.value : "",
                visible: values => values.kind === "url"
            },
            {
                key: "route",
                label: "Settings page",
                type: "picker",
                placeholder: "Search settings pages...",
                initial: existing?.kind === "settings" ? existing.value : "",
                suggestions: query => filterOptions(query, DISCORD_SETTINGS_ROUTES.map(entry => ({ value: entry.route, label: entry.label }))),
                visible: values => values.kind === "settings"
            },
            {
                key: "text",
                label: "Text",
                type: "textarea",
                placeholder: "Text to insert into the chat box",
                initial: existing?.kind === "message" ? existing.value : "",
                visible: values => values.kind === "message"
            }
        ],
        validate(values) {
            if (!values.name.trim()) return "Name is required.";
            const kind = values.kind as CustomCommandKind;
            if (kind === "url" && !parseUrl(values.url)) return "Enter a valid URL.";
            if (kind === "settings" && !DISCORD_SETTINGS_ROUTES.some(entry => entry.route === values.route)) return "Pick a settings page from the suggestions.";
            if (kind === "message" && !values.text.trim()) return "Text is required.";
            return null;
        },
        submit(values, ctx) {
            const kind = values.kind as CustomCommandKind;
            const value = kind === "url" ? values.url.trim() : kind === "settings" ? values.route : values.text;
            const next: CustomCommandData = {
                id: existing?.id ?? crypto.randomUUID(),
                name: values.name.trim(),
                kind,
                value
            };

            store.set(existing
                ? store.get().map(entry => entry.id === existing.id ? next : entry)
                : [...store.get(), next]);
            registerCustomCommands();

            showToast({ text: existing ? "Command saved." : "Command created.", variant: "success" });
            ctx.pop();
        }
    };

    return {
        title: existing ? "Edit Custom Command" : "Create Custom Command",
        icon: existing ? PencilIcon : PlusIcon,
        spec
    };
}

function toCommand(data: CustomCommandData): PaletteCommand {
    const extraActions: PaletteAction[] = [
        {
            id: "edit",
            label: "Edit Command",
            icon: PencilIcon,
            keepOpen: true,
            run: ctx => ctx.push(commandForm(data))
        },
        {
            id: "delete",
            label: "Delete Command",
            icon: TrashIcon,
            keepOpen: true,
            run() {
                store.set(store.get().filter(entry => entry.id !== data.id));
                registerCustomCommands();
                showToast({ text: "Command deleted.", variant: "success" });
            }
        }
    ];

    return {
        id: `custom.${data.id}`,
        title: data.name,
        subtitle: KIND_OPTIONS.find(option => option.value === data.kind)?.label,
        section: "Custom",
        icon: KIND_ICONS[data.kind],
        actions: [
            {
                id: "run",
                label: "Run Command",
                icon: BoltIcon,
                run: () => runCustomCommand(data)
            },
            ...extraActions
        ]
    };
}

export const loadCustomCommands = store.load;

export function registerCustomCommands() {
    registerCommands(OWNER, [
        {
            id: "custom.create",
            title: "Create Custom Command",
            section: "Custom",
            keywords: ["custom", "create", "new", "command"],
            icon: PlusIcon,
            page: () => commandForm(null)
        },
        ...store.get().map(toCommand)
    ]);
}

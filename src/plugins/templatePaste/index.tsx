/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, ChatBarButtonFactory, removeChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { ContextMenuApi, FluxDispatcher, Menu, React, TextArea, TextInput, useState } from "@webpack/common";

interface Template {
    title: string;
    content: string;
}

const DEFAULT_TEMPLATES: Template[] = Array.from({ length: 10 }, () => ({ title: "", content: "" }));

function todayDate() {
    const d = new Date();
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function applyPlaceholders(text: string) {
    return text.replace(/\{date\}/g, todayDate());
}

function getTemplates(): Template[] {
    const stored: Template[] = settings.store.templates ?? [];
    return Array.from({ length: 10 }, (_, i) => stored[i] ?? { title: "", content: "" });
}

const settings = definePluginSettings({
    templates: {
        type: OptionType.CUSTOM,
        default: DEFAULT_TEMPLATES,
    },
    editor: {
        type: OptionType.COMPONENT,
        component: () => <TemplateEditor />,
    },
});

function TemplateEditor() {
    const [templates, setTemplates] = useState<Template[]>(getTemplates);

    function update(index: number, field: keyof Template, value: string) {
        const next = templates.map((t, i) => i === index ? { ...t, [field]: value } : t);
        setTemplates(next);
        settings.store.templates = next;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {templates.map((tmpl, i) => (
                <div key={i} style={{
                    border: "1px solid var(--background-modifier-accent)",
                    borderRadius: "8px",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                }}>
                    <HeadingSecondary style={{ margin: 0 }}>Template {i + 1}</HeadingSecondary>
                    <Paragraph>Title (shown in dropdown)</Paragraph>
                    <TextInput
                        placeholder={`Template ${i + 1} title`}
                        value={tmpl.title}
                        onChange={v => update(i, "title", v)}
                    />
                    <Paragraph>Content (use {"{date}"} for today's date)</Paragraph>
                    <TextArea
                        placeholder="Template content..."
                        value={tmpl.content}
                        onChange={v => update(i, "content", v)}
                        rows={5}
                        style={{ resize: "vertical", fontFamily: "monospace", fontSize: "13px" }}
                    />
                </div>
            ))}
        </div>
    );
}

function TemplateMenu() {
    const active = getTemplates().filter(t => t.title);

    return (
        <Menu.Menu
            navId="template-paste-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Paste Template"
        >
            {active.length === 0
                ? <Menu.MenuItem id="no-templates" label="No templates configured — open Plugin Settings" disabled />
                : active.map((tmpl, i) => (
                    <Menu.MenuItem
                        key={i}
                        id={`template-${i}`}
                        label={tmpl.title}
                        action={() => insertTextIntoChatInputBox(applyPlaceholders(tmpl.content))}
                    />
                ))
            }
        </Menu.Menu>
    );
}

const ClipboardIcon = () => (
    <svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
);

const TemplatePasteButton: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Paste Template"
            onClick={e => ContextMenuApi.openContextMenu(e, () => <TemplateMenu />)}
        >
            <ClipboardIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "TemplatePaste",
    description: "Adds a clipboard button to the chat bar that opens a dropdown to paste a configurable text template.",
    authors: [Devs.vesperhex],
    dependencies: ["ChatInputButtonAPI"],
    settings,

    start() {
        addChatBarButton("TemplatePaste", TemplatePasteButton, ClipboardIcon);
    },

    stop() {
        removeChatBarButton("TemplatePaste");
    },
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize,openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Forms, React, Switch,TextInput, useState } from "@webpack/common";

interface EmbedField {
    name: string;
    value: string;
    inline: boolean;
}

interface EmbedData {
    title: string;
    description: string;
    url: string;
    color: string;
    authorName: string;
    authorIcon: string;
    footerText: string;
    footerIcon: string;
    imageUrl: string;
    thumbnailUrl: string;
    fields: EmbedField[];
}

type BuilderTab = "builder" | "json";

const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24
};

const DEFAULT_EMBED_COLOR = "#5865F2";

function forceReadableText(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.setProperty("color", "var(--text-normal, #dcddde)", "important");
    el.style.setProperty("caret-color", "var(--text-normal, #dcddde)", "important");
}

const styles: Record<string, React.CSSProperties> = {
    section: {
        marginBottom: SPACING.lg
    },
    sectionLabelRow: {
        display: "flex",
        alignItems: "baseline",
        gap: SPACING.xs,
        marginBottom: SPACING.xs
    },
    requiredTag: {
        color: "var(--text-danger, #f23f42)",
        fontWeight: 700
    },
    row: {
        display: "flex",
        gap: SPACING.sm,
        marginBottom: SPACING.sm
    },
    rowWithButton: {
        display: "flex",
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
        alignItems: "center"
    },
    banner: {
        display: "flex",
        alignItems: "center",
        gap: SPACING.sm,
        padding: `${SPACING.sm}px ${SPACING.md}px`,
        marginBottom: SPACING.lg,
        borderRadius: 8,
        fontSize: 14,
        lineHeight: "18px"
    },
    tabBar: {
        display: "flex",
        gap: SPACING.xs,
        marginBottom: SPACING.lg
    },
    embedCard: {
        position: "relative",
        borderRadius: 8,
        padding: SPACING.md,
        paddingLeft: SPACING.md + 4,
        marginBottom: SPACING.md,
        backgroundColor: "var(--background-secondary, #2b2d31)",
        border: "1px solid var(--background-modifier-accent, #4e5058)",
        overflow: "hidden"
    },
    embedAccent: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        width: 4
    },
    embedHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.md
    },
    colorPicker: {
        width: 32,
        height: 32,
        borderRadius: 6,
        border: "1px solid var(--background-modifier-accent, #4e5058)",
        flexShrink: 0,
        padding: 0,
        cursor: "pointer",
        backgroundColor: "transparent"
    },
    fieldRow: {
        display: "flex",
        gap: SPACING.sm,
        alignItems: "center",
        marginBottom: SPACING.sm
    },
    inlineLabel: {
        fontSize: 12,
        color: "var(--text-muted, #949ba4)",
        whiteSpace: "nowrap"
    },
    emptyState: {
        padding: SPACING.lg,
        textAlign: "center",
        color: "var(--text-muted, #949ba4)",
        fontSize: 14,
        border: "1px dashed var(--background-modifier-accent, #4e5058)",
        borderRadius: 8,
        marginBottom: SPACING.md
    },
    textarea: {
        width: "100%",
        minHeight: 72,
        padding: "10px 12px",
        borderRadius: 6,
        border: "1px solid var(--background-modifier-accent, #4e5058)",
        backgroundColor: "var(--input-background, var(--background-secondary, #2b2d31))",
        color: "var(--text-normal, #dcddde)",
        fontSize: 14,
        lineHeight: "18px",
        resize: "vertical",
        outline: "none",
        boxSizing: "border-box"
    },
    jsonToolbar: {
        display: "flex",
        gap: SPACING.sm,
        marginBottom: SPACING.sm
    },
    jsonEditorWrapper: {
        display: "flex",
        border: "1px solid var(--background-modifier-accent, #4e5058)",
        borderRadius: 6,
        overflow: "hidden",
        backgroundColor: "var(--input-background, var(--background-secondary, #2b2d31))"
    },
    jsonLineNumbers: {
        padding: "10px 8px",
        textAlign: "right",
        color: "var(--text-muted, #949ba4)",
        fontFamily: "var(--font-code, monospace)",
        fontSize: 12,
        lineHeight: "20px",
        userSelect: "none",
        backgroundColor: "var(--background-tertiary, #1e1f22)",
        minWidth: 36,
        overflow: "hidden"
    },
    jsonTextarea: {
        flex: 1,
        padding: "10px 12px",
        border: "none",
        outline: "none",
        backgroundColor: "transparent",
        color: "var(--text-normal, #dcddde)",
        fontFamily: "var(--font-code, monospace)",
        fontSize: 12,
        lineHeight: "20px",
        resize: "vertical",
        minHeight: 260,
        whiteSpace: "pre",
        overflow: "auto",
        boxSizing: "border-box"
    },
    jsonHint: {
        fontSize: 12,
        color: "var(--text-muted, #949ba4)",
        marginTop: SPACING.xs
    },
    footerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%"
    },
    credit: {
        fontSize: 11,
        color: "var(--text-muted, #949ba4)",
        opacity: 0.6
    }
};

function parseMessageLink(link: string) {
    const match = link.match(/channels\/(?:\d+|@me)\/(\d+)\/(\d+)/);
    if (!match) return null;
    return { channelId: match[1], messageId: match[2] };
}

function normalizeWebhookUrl(url: string) {
    const cleaned = url.trim().replace(/\/$/, "");
    return cleaned.replace(/^https:\/\/(?:ptb\.|canary\.)?discord\.com/, "https://discord.com");
}

function isValidHexColor(value: string) {
    return /^#([0-9a-f]{6})$/i.test(value.trim());
}

function colorValueToHex(color: any): string {
    if (typeof color === "number") return `#${color.toString(16).padStart(6, "0")}`;
    if (typeof color === "string" && color.trim()) {
        const trimmed = color.trim();
        return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    }
    return DEFAULT_EMBED_COLOR;
}

function createEmptyEmbed(): EmbedData {
    return {
        title: "",
        description: "",
        url: "",
        color: DEFAULT_EMBED_COLOR,
        authorName: "",
        authorIcon: "",
        footerText: "",
        footerIcon: "",
        imageUrl: "",
        thumbnailUrl: "",
        fields: []
    };
}

function mapApiEmbedsToState(rawEmbeds: any[]): EmbedData[] {
    return rawEmbeds.map((e: any) => ({
        title: e.title || "",
        description: e.description || "",
        url: e.url || "",
        color: colorValueToHex(e.color),
        authorName: e.author?.name || "",
        authorIcon: e.author?.icon_url || "",
        footerText: e.footer?.text || "",
        footerIcon: e.footer?.icon_url || "",
        imageUrl: e.image?.url || "",
        thumbnailUrl: e.thumbnail?.url || "",
        fields: Array.isArray(e.fields) ? e.fields.map((f: any) => ({
            name: f.name || "",
            value: f.value || "",
            inline: !!f.inline
        })) : []
    }));
}

function buildEmbedObject(e: EmbedData) {
    const embedObj: any = {};
    if (e.title.trim()) embedObj.title = e.title;
    if (e.description.trim()) embedObj.description = e.description;
    if (e.url.trim()) embedObj.url = e.url;
    if (e.color.trim()) {
        const parsedColor = parseInt(e.color.replace("#", ""), 16);
        if (!isNaN(parsedColor)) embedObj.color = parsedColor;
    }
    if (e.authorName.trim()) {
        embedObj.author = { name: e.authorName };
        if (e.authorIcon.trim()) embedObj.author.icon_url = e.authorIcon;
    }
    if (e.footerText.trim()) {
        embedObj.footer = { text: e.footerText };
        if (e.footerIcon.trim()) embedObj.footer.icon_url = e.footerIcon;
    }
    if (e.imageUrl.trim()) embedObj.image = { url: e.imageUrl };
    if (e.thumbnailUrl.trim()) embedObj.thumbnail = { url: e.thumbnailUrl };
    if (e.fields.length > 0) {
        embedObj.fields = e.fields
            .filter(f => f.name.trim() && f.value.trim())
            .map(f => ({ name: f.name, value: f.value, inline: f.inline }));
    }
    return embedObj;
}

async function sendWebhookRequest(
    rawUrl: string,
    method: "GET" | "POST" | "PATCH",
    data?: any
): Promise<{ ok: boolean; status: number; body?: any; text?: string }> {
    const targetUrl = normalizeWebhookUrl(rawUrl);
    const payloadString = data ? JSON.stringify(data) : undefined;

    const native = (window as any).VencordNative?.pluginHelpers?.inAppWebhooks?.sendWebhookRequest;

    if (typeof native !== "function") {
        return {
            ok: false,
            status: 0,
            text: "Native bridge unavailable. Make sure native.ts is present and a full rebuild has been performed."
        };
    }

    const res = await native(targetUrl, method, payloadString);

    let body: any = null;
    try { body = JSON.parse(res.text); } catch {}

    return {
        ok: res.ok,
        status: res.status,
        body,
        text: res.text
    };
}

function StatusBanner({ status }: { status: { type: "error" | "success"; text: string } }) {
    const isError = status.type === "error";
    return (
        <div
            style={{
                ...styles.banner,
                backgroundColor: isError ? "rgba(240, 71, 71, 0.1)" : "rgba(59, 165, 92, 0.1)",
                border: `1px solid ${isError ? "var(--text-danger, #f23f42)" : "var(--text-positive, #23a55a)"}`,
                color: "var(--text-normal, #dcddde)"
            }}
        >
            <span style={{ color: isError ? "var(--text-danger, #f23f42)" : "var(--text-positive, #23a55a)", fontWeight: 600 }}>
                {isError ? "Error" : "Success"}
            </span>
            <span>{status.text}</span>
        </div>
    );
}

function SectionLabel({ text, required }: { text: string; required?: boolean }) {
    return (
        <div style={styles.sectionLabelRow}>
            <Forms.FormTitle tag="h5" style={{ margin: 0 }}>{text}</Forms.FormTitle>
            {required && <span style={styles.requiredTag}>*</span>}
        </div>
    );
}

function JsonEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = React.useRef<HTMLDivElement>(null);
    const lineCount = value.split("\n").length;

    const handleScroll = () => {
        if (lineNumbersRef.current && textareaRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    return (
        <div style={styles.jsonEditorWrapper}>
            <div ref={lineNumbersRef} style={styles.jsonLineNumbers}>
                {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                ))}
            </div>
            <textarea
                ref={el => { textareaRef.current = el; forceReadableText(el); }}
                value={value}
                onChange={e => onChange(e.target.value)}
                onScroll={handleScroll}
                spellCheck={false}
                style={styles.jsonTextarea}
            />
        </div>
    );
}

function WebhookModal({ modalProps }: { modalProps: any }) {
    const [activeTab, setActiveTab] = useState<BuilderTab>("builder");

    const [webhookUrl, setWebhookUrl] = useState("");
    const [username, setUsername] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [content, setContent] = useState("");
    const [messageLink, setMessageLink] = useState("");
    const [embeds, setEmbeds] = useState<EmbedData[]>([]);

    const [jsonText, setJsonText] = useState("");
    const [jsonError, setJsonError] = useState<string | null>(null);

    const [statusMessage, setStatusMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
    const [urlError, setUrlError] = useState(false);

    const buildPayload = () => {
        const payload: any = {};
        if (content.trim()) payload.content = content;
        if (username.trim()) payload.username = username;
        if (avatarUrl.trim()) payload.avatar_url = avatarUrl;
        if (embeds.length > 0) payload.embeds = embeds.map(buildEmbedObject);
        return payload;
    };

    const syncJsonFromBuilder = () => {
        setJsonError(null);
        setJsonText(JSON.stringify(buildPayload(), null, 2));
    };

    const applyJsonToBuilder = () => {
        try {
            const parsed = JSON.parse(jsonText);
            setContent(typeof parsed.content === "string" ? parsed.content : "");
            setUsername(typeof parsed.username === "string" ? parsed.username : "");
            setAvatarUrl(typeof parsed.avatar_url === "string" ? parsed.avatar_url : "");
            setEmbeds(Array.isArray(parsed.embeds) ? mapApiEmbedsToState(parsed.embeds) : []);
            setJsonError(null);
            setStatusMessage({ type: "success", text: "JSON applied to the builder." });
        } catch (err: any) {
            setJsonError(`Invalid JSON: ${err.message || "could not be parsed"}`);
        }
    };

    const openJsonTab = () => {
        if (!jsonText.trim()) syncJsonFromBuilder();
        setActiveTab("json");
    };

    const addEmbed = () => {
        setEmbeds([...embeds, createEmptyEmbed()]);
    };

    const removeEmbed = (index: number) => {
        setEmbeds(embeds.filter((_, i) => i !== index));
    };

    const updateEmbed = (index: number, key: keyof EmbedData, value: any) => {
        const updated = [...embeds];
        updated[index] = { ...updated[index], [key]: value };
        setEmbeds(updated);
    };

    const addField = (embedIndex: number) => {
        const updated = [...embeds];
        updated[embedIndex].fields.push({ name: "", value: "", inline: false });
        setEmbeds(updated);
    };

    const removeField = (embedIndex: number, fieldIndex: number) => {
        const updated = [...embeds];
        updated[embedIndex].fields = updated[embedIndex].fields.filter((_, fI) => fI !== fieldIndex);
        setEmbeds(updated);
    };

    const updateField = (embedIndex: number, fieldIndex: number, key: keyof EmbedField, value: any) => {
        const updated = [...embeds];
        updated[embedIndex].fields[fieldIndex] = {
            ...updated[embedIndex].fields[fieldIndex],
            [key]: value
        };
        setEmbeds(updated);
    };

    const handleLoadMessage = async () => {
        setStatusMessage(null);
        if (!webhookUrl.trim()) {
            setUrlError(true);
            setStatusMessage({ type: "error", text: "Webhook URL is required." });
            return;
        }

        const parsed = parseMessageLink(messageLink);
        if (!parsed) {
            setStatusMessage({ type: "error", text: "Invalid Discord message link format." });
            return;
        }

        const url = `${webhookUrl}/messages/${parsed.messageId}`;

        try {
            const res = await sendWebhookRequest(url, "GET");

            if (!res.ok) {
                setStatusMessage({ type: "error", text: `Failed to load message (${res.status}): ${res.text || "Unknown error"}` });
                return;
            }

            const data = res.body || {};

            if (data.content) setContent(data.content);
            if (Array.isArray(data.embeds)) setEmbeds(mapApiEmbedsToState(data.embeds));

            setStatusMessage({ type: "success", text: "Message loaded successfully." });
        } catch (err: any) {
            setStatusMessage({ type: "error", text: `Error: ${err.message || "Failed"}` });
        }
    };

    const handleSendOrEdit = async () => {
        setStatusMessage(null);
        setUrlError(false);

        if (!webhookUrl.trim()) {
            setUrlError(true);
            setStatusMessage({ type: "error", text: "Webhook URL is required." });
            return;
        }

        if (!content.trim() && embeds.length === 0) {
            setStatusMessage({ type: "error", text: "Provide either message content or at least one embed." });
            return;
        }

        const payload = buildPayload();

        const isEditMode = messageLink.trim().length > 0;
        let endpoint = webhookUrl;
        let method: "POST" | "PATCH" = "POST";

        if (isEditMode) {
            const parsed = parseMessageLink(messageLink);
            if (!parsed) {
                setStatusMessage({ type: "error", text: "Invalid Discord message link format." });
                return;
            }
            endpoint = `${endpoint}/messages/${parsed.messageId}`;
            method = "PATCH";
        }

        try {
            const res = await sendWebhookRequest(endpoint, method, payload);

            if (res.ok) {
                setStatusMessage({
                    type: "success",
                    text: isEditMode ? "Message edited successfully." : "Message sent successfully."
                });
            } else {
                const errMsg = res.body?.message || (typeof res.body === "string" ? res.body : res.text) || "Failed to execute request";
                setStatusMessage({
                    type: "error",
                    text: `Error ${res.status}: ${errMsg}`
                });
            }
        } catch (err: any) {
            setStatusMessage({ type: "error", text: `Request error: ${err.message || "Network error"}` });
        }
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" style={{ margin: 0 }}>Webhook Builder</Forms.FormTitle>
            </ModalHeader>

            <ModalContent style={{ padding: `${SPACING.lg}px` }}>
                {statusMessage && <StatusBanner status={statusMessage} />}

                <div style={styles.section}>
                    <SectionLabel text="Webhook URL" required />
                    <TextInput
                        placeholder="https://discord.com/api/webhooks/..."
                        value={webhookUrl}
                        onChange={setWebhookUrl}
                        error={urlError ? "Webhook URL is required" : undefined}
                    />
                </div>

                <div style={styles.tabBar}>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={activeTab === "builder" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                        onClick={() => setActiveTab("builder")}
                    >
                        Builder
                    </Button>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={activeTab === "json" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                        onClick={openJsonTab}
                    >
                        JSON editor
                    </Button>
                </div>

                {activeTab === "builder" && (
                    <>
                        <div style={styles.section}>
                            <SectionLabel text="Edit an existing message" />
                            <div style={styles.rowWithButton}>
                                <TextInput
                                    placeholder="https://discord.com/channels/123/456/789"
                                    value={messageLink}
                                    onChange={setMessageLink}
                                    style={{ flex: 1 }}
                                />
                                <Button color={Button.Colors.PRIMARY} onClick={handleLoadMessage}>
                                    Load message
                                </Button>
                            </div>
                        </div>

                        <div style={styles.section}>
                            <SectionLabel text="Profile override" />
                            <div style={styles.row}>
                                <TextInput placeholder="Username" value={username} onChange={setUsername} style={{ flex: 1 }} />
                                <TextInput placeholder="Avatar URL" value={avatarUrl} onChange={setAvatarUrl} style={{ flex: 1 }} />
                            </div>
                        </div>

                        <div style={styles.section}>
                            <SectionLabel text="Message content" />
                            <textarea
                                ref={forceReadableText}
                                placeholder="Message content (plain text)"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                style={styles.textarea}
                            />
                        </div>

                        <div style={styles.section}>
                            <SectionLabel text="Embeds" />

                            {embeds.length === 0 && (
                                <div style={styles.emptyState}>
                                    No embeds yet. Click "Add embed" to build one.
                                </div>
                            )}

                            {embeds.map((embed, idx) => {
                                const swatchColor = isValidHexColor(embed.color) ? embed.color : DEFAULT_EMBED_COLOR;
                                return (
                                    <div key={idx} style={styles.embedCard}>
                                        <div style={{ ...styles.embedAccent, backgroundColor: swatchColor }} />

                                        <div style={styles.embedHeader}>
                                            <Forms.FormTitle tag="h4" style={{ margin: 0 }}>Embed {idx + 1}</Forms.FormTitle>
                                            <Button color={Button.Colors.RED} size={Button.Sizes.MINI} onClick={() => removeEmbed(idx)}>
                                                Remove
                                            </Button>
                                        </div>

                                        <div style={styles.row}>
                                            <TextInput placeholder="Title" value={embed.title} onChange={v => updateEmbed(idx, "title", v)} style={{ flex: 2 }} />
                                            <div style={{ display: "flex", gap: SPACING.xs, flex: 1, alignItems: "center" }}>
                                                <input
                                                    type="color"
                                                    value={swatchColor}
                                                    onChange={e => updateEmbed(idx, "color", e.target.value)}
                                                    style={styles.colorPicker}
                                                    title="Pick embed color"
                                                />
                                                <TextInput placeholder="#5865F2" value={embed.color} onChange={v => updateEmbed(idx, "color", v)} style={{ flex: 1 }} />
                                            </div>
                                        </div>

                                        <div style={styles.row}>
                                            <textarea
                                                ref={forceReadableText}
                                                placeholder="Description"
                                                value={embed.description}
                                                onChange={e => updateEmbed(idx, "description", e.target.value)}
                                                style={{ ...styles.textarea, minHeight: 60 }}
                                            />
                                        </div>

                                        <div style={styles.row}>
                                            <TextInput placeholder="Title URL" value={embed.url} onChange={v => updateEmbed(idx, "url", v)} style={{ flex: 1 }} />
                                            <TextInput placeholder="Image URL" value={embed.imageUrl} onChange={v => updateEmbed(idx, "imageUrl", v)} style={{ flex: 1 }} />
                                            <TextInput placeholder="Thumbnail URL" value={embed.thumbnailUrl} onChange={v => updateEmbed(idx, "thumbnailUrl", v)} style={{ flex: 1 }} />
                                        </div>

                                        <div style={styles.row}>
                                            <TextInput placeholder="Author name" value={embed.authorName} onChange={v => updateEmbed(idx, "authorName", v)} style={{ flex: 1 }} />
                                            <TextInput placeholder="Author icon URL" value={embed.authorIcon} onChange={v => updateEmbed(idx, "authorIcon", v)} style={{ flex: 1 }} />
                                        </div>

                                        <div style={{ ...styles.row, marginBottom: SPACING.md }}>
                                            <TextInput placeholder="Footer text" value={embed.footerText} onChange={v => updateEmbed(idx, "footerText", v)} style={{ flex: 1 }} />
                                            <TextInput placeholder="Footer icon URL" value={embed.footerIcon} onChange={v => updateEmbed(idx, "footerIcon", v)} style={{ flex: 1 }} />
                                        </div>

                                        <Forms.FormDivider style={{ marginBottom: SPACING.md }} />

                                        <Forms.FormTitle tag="h5">Fields</Forms.FormTitle>
                                        {embed.fields.map((field, fIdx) => (
                                            <div key={fIdx} style={styles.fieldRow}>
                                                <TextInput placeholder="Name" value={field.name} onChange={v => updateField(idx, fIdx, "name", v)} style={{ flex: 2 }} />
                                                <TextInput placeholder="Value" value={field.value} onChange={v => updateField(idx, fIdx, "value", v)} style={{ flex: 2 }} />
                                                <Switch value={field.inline} onChange={v => updateField(idx, fIdx, "inline", v)} style={{ margin: 0 }} />
                                                <span style={styles.inlineLabel}>Inline</span>
                                                <Button color={Button.Colors.RED} size={Button.Sizes.MINI} onClick={() => removeField(idx, fIdx)}>
                                                    Remove
                                                </Button>
                                            </div>
                                        ))}
                                        <Button color={Button.Colors.PRIMARY} size={Button.Sizes.SMALL} onClick={() => addField(idx)}>
                                            Add field
                                        </Button>
                                    </div>
                                );
                            })}

                            <Button color={Button.Colors.GREEN} size={Button.Sizes.SMALL} onClick={addEmbed}>
                                Add embed
                            </Button>
                        </div>
                    </>
                )}

                {activeTab === "json" && (
                    <div style={styles.section}>
                        <SectionLabel text="Raw payload (JSON)" />
                        <div style={styles.jsonToolbar}>
                            <Button size={Button.Sizes.SMALL} color={Button.Colors.PRIMARY} onClick={syncJsonFromBuilder}>
                                Load current builder
                            </Button>
                            <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={applyJsonToBuilder}>
                                Apply to builder
                            </Button>
                        </div>
                        <JsonEditor value={jsonText} onChange={setJsonText} />
                        {jsonError && (
                            <div style={{ ...styles.jsonHint, color: "var(--text-danger, #f23f42)" }}>{jsonError}</div>
                        )}
                        <div style={styles.jsonHint}>
                            Edits here only take effect after clicking "Apply to builder". Sending a message always uses the builder's current state.
                        </div>
                    </div>
                )}
            </ModalContent>

            <ModalFooter>
                <div style={styles.footerRow}>
                    <span style={styles.credit}>inAppWebhooks</span>
                    <div style={{ display: "flex", gap: SPACING.sm }}>
                        <Button color={Button.Colors.BRAND} onClick={handleSendOrEdit}>
                            {messageLink.trim() ? "Edit message" : "Send message"}
                        </Button>
                        <Button color={Button.Colors.PRIMARY} onClick={modalProps.onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </ModalFooter>
        </ModalRoot>
    );
}

export default definePlugin({
    name: "inAppWebhooks",
    description: "Built-in interface to create, send, and edit custom webhook messages and embeds within Discord.",
    authors: [{ name: "enart", id: 350222855813726208n }],
    commands: [
        {
            name: "webhook",
            description: "Opens the inApp Webhooks Builder UI",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute(_, ctx) {
                openModal(props => <WebhookModal modalProps={props} />);
            }
        }
    ]
});

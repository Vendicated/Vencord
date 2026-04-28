/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { CodeBlock } from "@components/CodeBlock";
import { Divider } from "@components/Divider";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Devs } from "@utils/constants";
import { copyWithToast, getCurrentGuild, getIntlMessage } from "@utils/discord";
import { Margins } from "@utils/margins";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Button, ChannelStore, GuildRoleStore, Menu, React } from "@webpack/common";

// ==================== ICONS ====================
const CopyIcon: IconComponent = ({ height = 20, width = 20, className }) => {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width={width} height={height} className={className}>
            <path d="M12.9297 3.25007C12.7343 3.05261 12.4154 3.05226 12.2196 3.24928L11.5746 3.89824C11.3811 4.09297 11.3808 4.40733 11.5739 4.60245L16.5685 9.64824C16.7614 9.84309 16.7614 10.1569 16.5685 10.3517L11.5739 15.3975C11.3808 15.5927 11.3811 15.907 11.5746 16.1017L12.2196 16.7507C12.4154 16.9477 12.7343 16.9474 12.9297 16.7499L19.2604 10.3517C19.4532 10.1568 19.4532 9.84314 19.2604 9.64832L12.9297 3.25007Z" />
            <path d="M8.42616 4.60245C8.6193 4.40733 8.61898 4.09297 8.42545 3.89824L7.78047 3.24928C7.58466 3.05226 7.26578 3.05261 7.07041 3.25007L0.739669 9.64832C0.5469 9.84314 0.546901 10.1568 0.739669 10.3517L7.07041 16.7499C7.26578 16.9474 7.58465 16.9477 7.78047 16.7507L8.42545 16.1017C8.61898 15.907 8.6193 15.5927 8.42616 15.3975L3.43155 10.3517C3.23869 10.1569 3.23869 9.84309 3.43155 9.64824L8.42616 4.60245Z" />
        </svg>
    );
};

const DownloadIcon: IconComponent = ({ height = 20, width = 20, className }) => {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" width={width} height={height} className={className}>
            <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
        </svg>
    );
};

const SearchIcon: IconComponent = ({ height = 20, width = 20, className }) => {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" width={width} height={height} className={className}>
            <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
        </svg>
    );
};

// ==================== SETTINGS ====================
const settings = definePluginSettings({
    clickMethod: {
        description: "Button click behavior",
        type: OptionType.SELECT,
        options: [
            { label: "Left Click to view raw", value: "Left", default: true },
            { label: "Right Click to view raw", value: "Right" }
        ]
    },
    defaultTab: {
        description: "Default tab in view raw modal",
        type: OptionType.SELECT,
        options: [
            { label: "Raw JSON", value: "json", default: true },
            { label: "Formatted View", value: "formatted" },
            { label: "Tree View", value: "tree" },
            { label: "Preview", value: "preview" }
        ]
    },
    enableEdit: {
        description: "Enable JSON editing",
        type: OptionType.BOOLEAN,
        default: true
    },
    enablePreview: {
        description: "Enable live preview of edited data",
        type: OptionType.BOOLEAN,
        default: true
    },
    validateOnEdit: {
        description: "Validate JSON syntax while editing",
        type: OptionType.BOOLEAN,
        default: true
    },
    enableSearch: {
        description: "Enable search in JSON data",
        type: OptionType.BOOLEAN,
        default: true
    },
    syntaxHighlight: {
        description: "Enable syntax highlighting",
        type: OptionType.BOOLEAN,
        default: true
    },
    autoFormat: {
        description: "Auto-format JSON (pretty print)",
        type: OptionType.BOOLEAN,
        default: true
    },
    indentSize: {
        description: "JSON indentation size",
        type: OptionType.SLIDER,
        default: 4,
        markers: [2, 3, 4, 6, 8]
    },
    showMetadata: {
        description: "Show metadata (size, properties count, etc.)",
        type: OptionType.BOOLEAN,
        default: true
    },
    enableDiff: {
        description: "Enable diff view (compare with previous)",
        type: OptionType.BOOLEAN,
        default: false
    },
    saveHistory: {
        description: "Save view history",
        type: OptionType.BOOLEAN,
        default: false
    },
    maxHistoryEntries: {
        description: "Maximum history entries",
        type: OptionType.SLIDER,
        default: 50,
        markers: [10, 25, 50, 100, 200]
    },
    enableExport: {
        description: "Enable export to file",
        type: OptionType.BOOLEAN,
        default: true
    },
    exportFormat: {
        description: "Default export format",
        type: OptionType.SELECT,
        options: [
            { label: "JSON", value: "json", default: true },
            { label: "YAML", value: "yaml" },
            { label: "XML", value: "xml" },
            { label: "CSV", value: "csv" }
        ]
    },
    cleanSensitiveData: {
        description: "Remove sensitive data (email, phone, tokens)",
        type: OptionType.BOOLEAN,
        default: true
    },
    showTimestamps: {
        description: "Show human-readable timestamps",
        type: OptionType.BOOLEAN,
        default: true
    },
    expandByDefault: {
        description: "Expand all JSON nodes by default",
        type: OptionType.BOOLEAN,
        default: false
    },
    viewHistory: {
        description: "View history (JSON) - managed automatically",
        type: OptionType.STRING,
        default: "[]",
        hidden: true
    }
});

// ==================== UTILITY FUNCTIONS ====================
function sortObject<T extends object>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).sort(([k1], [k2]) => k1.localeCompare(k2))) as T;
}

function cleanMessage(msg: Message) {
    const clone = sortObject(JSON.parse(JSON.stringify(msg)));

    if (settings.store.cleanSensitiveData) {
        for (const key of ["email", "phone", "mfaEnabled", "personalConnectionId", "token", "password"]) {
            delete clone.author?.[key];
        }
    }

    // Message logger properties
    const cloneAny = clone as any;
    delete cloneAny.editHistory;
    delete cloneAny.deleted;
    delete cloneAny.firstEditTimestamp;
    cloneAny.attachments?.forEach(a => delete a.deleted);

    return clone;
}

function getObjectSize(obj: any): string {
    const str = JSON.stringify(obj);
    const bytes = new Blob([str]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getPropertyCount(obj: any): number {
    if (typeof obj !== 'object' || obj === null) return 0;
    return Object.keys(obj).length;
}

function formatTimestamp(timestamp: string | number): string {
    if (!settings.store.showTimestamps) return timestamp.toString();
    try {
        const date = new Date(timestamp);
        return `${date.toLocaleString()} (${timestamp})`;
    } catch {
        return timestamp.toString();
    }
}

function exportToFile(data: string, filename: string, format: string): void {
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function convertToYAML(obj: any): string {
    // Simple YAML conversion
    function toYAML(obj: any, indent = 0): string {
        const spaces = "  ".repeat(indent);
        if (typeof obj !== 'object' || obj === null) {
            return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => `\n${spaces}- ${toYAML(item, indent + 1)}`).join('');
        }
        return Object.entries(obj)
            .map(([key, value]) => `\n${spaces}${key}: ${toYAML(value, indent + 1)}`)
            .join('');
    }
    return toYAML(obj).trim();
}

function saveToHistory(type: string, data: any): void {
    if (!settings.store.saveHistory) return;

    try {
        const history = JSON.parse(settings.store.viewHistory || "[]");
        history.unshift({
            type,
            timestamp: Date.now(),
            size: getObjectSize(data),
            properties: getPropertyCount(data)
        });

        const maxEntries = settings.store.maxHistoryEntries;
        settings.store.viewHistory = JSON.stringify(history.slice(0, maxEntries));
    } catch (err) {
        console.error("[ViewRaw] Failed to save history:", err);
    }
}

// ==================== MODAL COMPONENT ====================
function ViewRawModal({ json, type, msgContent, onClose }: {
    json: string;
    type: string;
    msgContent?: string;
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = React.useState(settings.store.defaultTab);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [filteredJson, setFilteredJson] = React.useState(json);
    const [editedJson, setEditedJson] = React.useState(json);
    const [isEditing, setIsEditing] = React.useState(false);
    const [jsonError, setJsonError] = React.useState<string | null>(null);

    const parsedData = React.useMemo(() => {
        try {
            return JSON.parse(isEditing ? editedJson : json);
        } catch {
            return null;
        }
    }, [json, editedJson, isEditing]);

    const metadata = React.useMemo(() => ({
        size: getObjectSize(parsedData),
        properties: getPropertyCount(parsedData),
        type: Array.isArray(parsedData) ? "Array" : typeof parsedData
    }), [parsedData]);

    // Validate JSON on edit
    React.useEffect(() => {
        if (!isEditing || !settings.store.validateOnEdit) {
            setJsonError(null);
            return;
        }

        try {
            JSON.parse(editedJson);
            setJsonError(null);
        } catch (err: any) {
            setJsonError(err.message);
        }
    }, [editedJson, isEditing]);

    React.useEffect(() => {
        if (!settings.store.enableSearch || !searchQuery) {
            setFilteredJson(isEditing ? editedJson : json);
            return;
        }

        try {
            const data = JSON.parse(isEditing ? editedJson : json);
            const filter = (obj: any, query: string): any => {
                if (typeof obj === 'string' && obj.toLowerCase().includes(query.toLowerCase())) {
                    return obj;
                }
                if (typeof obj === 'object' && obj !== null) {
                    const filtered: any = Array.isArray(obj) ? [] : {};
                    for (const [key, value] of Object.entries(obj)) {
                        if (key.toLowerCase().includes(query.toLowerCase())) {
                            filtered[key] = value;
                        } else {
                            const filteredValue = filter(value, query);
                            if (filteredValue !== undefined) {
                                filtered[key] = filteredValue;
                            }
                        }
                    }
                    return Object.keys(filtered).length > 0 ? filtered : undefined;
                }
                return undefined;
            };

            const filtered = filter(data, searchQuery);
            setFilteredJson(filtered ? JSON.stringify(filtered, null, settings.store.indentSize) : "{}");
        } catch {
            setFilteredJson(isEditing ? editedJson : json);
        }
    }, [searchQuery, json, editedJson, isEditing]);

    const handleExport = () => {
        const format = settings.store.exportFormat;
        const dataToExport = isEditing ? editedJson : json;
        let data = dataToExport;

        try {
            const parsed = JSON.parse(dataToExport);
            if (format === "yaml") {
                data = convertToYAML(parsed);
            } else if (format === "xml") {
                data = `<?xml version="1.0"?>\n<root>${JSON.stringify(parsed)}</root>`;
            } else if (format === "csv" && Array.isArray(parsed)) {
                const headers = Object.keys(parsed[0] || {});
                data = [headers.join(","), ...parsed.map(row => headers.map(h => row[h]).join(","))].join("\n");
            }
        } catch {
            // Use raw data if parsing fails
        }

        exportToFile(data, `${type.toLowerCase()}_${Date.now()}`, format);
    };

    const toggleEdit = () => {
        if (isEditing) {
            // Exiting edit mode - validate first
            try {
                JSON.parse(editedJson);
                setIsEditing(false);
            } catch {
                if (confirm("JSON is invalid. Discard changes?")) {
                    setEditedJson(json);
                    setIsEditing(false);
                }
            }
        } else {
            setIsEditing(true);
        }
    };

    const resetEdit = () => {
        setEditedJson(json);
        setJsonError(null);
    };

    const renderPreview = () => {
        if (!parsedData) return <div>Invalid JSON data</div>;

        // User preview
        if (type === "User") {
            return (
                <div style={{ padding: "20px", background: "var(--background-secondary)", borderRadius: "8px" }}>
                    <Flex style={{ gap: "16px", alignItems: "flex-start" }}>
                        <div>
                            {parsedData.avatar && (
                                <img
                                    src={`https://cdn.discordapp.com/avatars/${parsedData.id}/${parsedData.avatar}.${parsedData.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`}
                                    alt="Avatar"
                                    style={{ width: "80px", height: "80px", borderRadius: "50%" }}
                                />
                            )}
                            {parsedData.avatarDecorationData && (
                                <div style={{ marginTop: "8px", fontSize: "12px", opacity: 0.7 }}>
                                    Avatar Decoration ✨
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <Flex style={{ alignItems: "center", gap: "8px" }}>
                                <Heading>{parsedData.globalName || parsedData.username || "Unknown"}</Heading>
                                {parsedData.bot && <span style={{ background: "var(--brand-500)", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700" }}>BOT</span>}
                                {parsedData.system && <span style={{ background: "var(--status-danger)", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700" }}>SYSTEM</span>}
                            </Flex>
                            <BaseText style={{ opacity: 0.8 }}>@{parsedData.username}</BaseText>
                            {parsedData.discriminator && parsedData.discriminator !== "0" && (
                                <BaseText style={{ opacity: 0.7 }}>#{parsedData.discriminator}</BaseText>
                            )}
                            <BaseText style={{ opacity: 0.6, fontSize: "12px", marginTop: "4px" }}>ID: {parsedData.id}</BaseText>

                            {parsedData.primaryGuild && (
                                <div style={{ marginTop: "12px", padding: "8px", background: "var(--background-tertiary)", borderRadius: "6px" }}>
                                    <Flex style={{ alignItems: "center", gap: "6px" }}>
                                        {parsedData.primaryGuild.badge && (
                                            <img
                                                src={`https://cdn.discordapp.com/clan-badges/${parsedData.primaryGuild.badge}.png?size=24`}
                                                alt="Clan Badge"
                                                style={{ width: "20px", height: "20px" }}
                                            />
                                        )}
                                        <BaseText style={{ fontWeight: "600" }}>{parsedData.primaryGuild.tag}</BaseText>
                                    </Flex>
                                </div>
                            )}

                            {parsedData.collectibles?.nameplate && (
                                <div style={{ marginTop: "8px" }}>
                                    <BaseText style={{ fontSize: "12px", opacity: 0.7 }}>
                                        Nameplate: {parsedData.collectibles.nameplate.palette}
                                    </BaseText>
                                </div>
                            )}

                            <Flex style={{ gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
                                {parsedData.premiumType !== null && (
                                    <span style={{ background: "rgba(255, 115, 250, 0.2)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                                        💎 NITRO
                                    </span>
                                )}
                                {parsedData.verified && (
                                    <span style={{ background: "rgba(67, 181, 129, 0.2)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                                        ✓ VERIFIED
                                    </span>
                                )}
                                {parsedData.mfaEnabled && (
                                    <span style={{ background: "rgba(88, 101, 242, 0.2)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                                        🔐 2FA
                                    </span>
                                )}
                                {parsedData.mobile && (
                                    <span style={{ background: "var(--background-tertiary)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
                                        📱 Mobile
                                    </span>
                                )}
                                {parsedData.desktop && (
                                    <span style={{ background: "var(--background-tertiary)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
                                        🖥️ Desktop
                                    </span>
                                )}
                            </Flex>
                        </div>
                    </Flex>

                    {parsedData.banner && (
                        <img
                            src={`https://cdn.discordapp.com/banners/${parsedData.id}/${parsedData.banner}.${parsedData.banner.startsWith('a_') ? 'gif' : 'png'}?size=600`}
                            alt="Banner"
                            style={{ width: "100%", marginTop: "16px", borderRadius: "8px" }}
                        />
                    )}
                </div>
            );
        }

        // Channel preview
        if (type === "Channel") {
            const channelTypes = { 0: "Text", 2: "Voice", 4: "Category", 5: "Announcement", 13: "Stage", 15: "Forum" };
            return (
                <div style={{ padding: "20px", background: "var(--background-secondary)", borderRadius: "8px" }}>
                    <Flex style={{ gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                        {parsedData.iconEmoji && (
                            <span style={{ fontSize: "24px" }}>{parsedData.iconEmoji.name}</span>
                        )}
                        <Heading>#{parsedData.name || "Unknown Channel"}</Heading>
                        <span style={{ background: "var(--background-tertiary)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                            {channelTypes[parsedData.type] || `Type ${parsedData.type}`}
                        </span>
                    </Flex>

                    {parsedData.topic && (
                        <div style={{ padding: "12px", background: "var(--background-tertiary)", borderRadius: "6px", marginTop: "12px" }}>
                            <BaseText>{parsedData.topic}</BaseText>
                        </div>
                    )}

                    {parsedData.themeColor && (
                        <Flex style={{ alignItems: "center", gap: "8px", marginTop: "12px" }}>
                            <div style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "4px",
                                background: `#${parsedData.themeColor.toString(16).padStart(6, '0')}`
                            }} />
                            <BaseText style={{ fontSize: "12px" }}>Theme Color</BaseText>
                        </Flex>
                    )}

                    <Flex style={{ gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
                        {parsedData.nsfw_ && (
                            <span style={{ background: "rgba(242, 63, 67, 0.2)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                                🔞 NSFW
                            </span>
                        )}
                        {parsedData.rateLimitPerUser_ > 0 && (
                            <span style={{ background: "var(--background-tertiary)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
                                ⏱️ Slowmode: {parsedData.rateLimitPerUser_}s
                            </span>
                        )}
                    </Flex>

                    <BaseText style={{ opacity: 0.6, fontSize: "12px", marginTop: "12px" }}>
                        ID: {parsedData.id} • Position: {parsedData.position_}
                    </BaseText>
                </div>
            );
        }

        // Guild preview
        if (type === "Guild") {
            return (
                <div style={{ padding: "20px", background: "var(--background-secondary)", borderRadius: "8px" }}>
                    <Flex style={{ gap: "16px", alignItems: "flex-start", marginBottom: "16px" }}>
                        {parsedData.icon && (
                            <img
                                src={`https://cdn.discordapp.com/icons/${parsedData.id}/${parsedData.icon}.${parsedData.icon.startsWith('a_') ? 'gif' : 'png'}?size=128`}
                                alt="Icon"
                                style={{ width: "64px", height: "64px", borderRadius: "16px" }}
                            />
                        )}
                        <div style={{ flex: 1 }}>
                            <Heading>{parsedData.name || "Unknown Guild"}</Heading>
                            {parsedData.description && (
                                <BaseText style={{ marginTop: "8px", opacity: 0.8 }}>{parsedData.description}</BaseText>
                            )}
                            <Flex style={{ gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                                {parsedData.premiumTier > 0 && (
                                    <span style={{ background: "rgba(255, 115, 250, 0.2)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                                        💎 LEVEL {parsedData.premiumTier}
                                    </span>
                                )}
                                {parsedData.premiumSubscriberCount > 0 && (
                                    <span style={{ background: "var(--background-tertiary)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
                                        {parsedData.premiumSubscriberCount} Boosts
                                    </span>
                                )}
                                {parsedData.verified && (
                                    <span style={{ background: "rgba(67, 181, 129, 0.2)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                                        ✓ VERIFIED
                                    </span>
                                )}
                                {parsedData.features?.includes("COMMUNITY") && (
                                    <span style={{ background: "rgba(88, 101, 242, 0.2)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                                        👥 COMMUNITY
                                    </span>
                                )}
                                {parsedData.features?.includes("DISCOVERABLE") && (
                                    <span style={{ background: "rgba(254, 231, 92, 0.2)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                                        🔍 DISCOVERABLE
                                    </span>
                                )}
                            </Flex>
                        </div>
                    </Flex>

                    {parsedData.banner && (
                        <img
                            src={`https://cdn.discordapp.com/banners/${parsedData.id}/${parsedData.banner}.${parsedData.banner.startsWith('a_') ? 'gif' : 'png'}?size=600`}
                            alt="Banner"
                            style={{ width: "100%", borderRadius: "8px", marginBottom: "12px" }}
                        />
                    )}

                    {parsedData.splash && (
                        <img
                            src={`https://cdn.discordapp.com/splashes/${parsedData.id}/${parsedData.splash}.png?size=600`}
                            alt="Splash"
                            style={{ width: "100%", borderRadius: "8px", marginTop: "12px" }}
                        />
                    )}

                    {parsedData.vanityURLCode && (
                        <div style={{ marginTop: "12px", padding: "12px", background: "var(--background-tertiary)", borderRadius: "6px" }}>
                            <BaseText style={{ fontFamily: "monospace" }}>discord.gg/{parsedData.vanityURLCode}</BaseText>
                        </div>
                    )}

                    <BaseText style={{ opacity: 0.6, fontSize: "12px", marginTop: "12px" }}>
                        ID: {parsedData.id} • Owner: {parsedData.ownerId}
                    </BaseText>
                </div>
            );
        }

        // Message preview
        if (type === "Message" && parsedData.author) {
            return (
                <div style={{ padding: "20px", background: "var(--background-secondary)", borderRadius: "8px" }}>
                    <Flex style={{ gap: "12px", marginBottom: "12px" }}>
                        {parsedData.author.avatar && (
                            <img
                                src={`https://cdn.discordapp.com/avatars/${parsedData.author.id}/${parsedData.author.avatar}.${parsedData.author.avatar.startsWith('a_') ? 'gif' : 'png'}?size=40`}
                                alt="Avatar"
                                style={{ width: "40px", height: "40px", borderRadius: "50%" }}
                            />
                        )}
                        <div style={{ flex: 1 }}>
                            <Flex style={{ alignItems: "center", gap: "8px" }}>
                                <BaseText weight="semibold">{parsedData.author.globalName || parsedData.author.username}</BaseText>
                                {parsedData.author.bot && (
                                    <span style={{ background: "var(--brand-500)", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700" }}>BOT</span>
                                )}
                            </Flex>
                            <BaseText style={{ fontSize: "12px", opacity: 0.7 }}>
                                {parsedData.timestamp && new Date(parsedData.timestamp).toLocaleString()}
                                {parsedData.editedTimestamp && " (edited)"}
                            </BaseText>
                        </div>
                    </Flex>

                    <div style={{ padding: "12px", background: "var(--background-tertiary)", borderRadius: "6px" }}>
                        <BaseText style={{ whiteSpace: "pre-wrap" }}>{parsedData.content || "(No content)"}</BaseText>
                    </div>

                    {parsedData.embeds?.length > 0 && (
                        <div style={{ marginTop: "12px" }}>
                            <BaseText style={{ fontSize: "12px", opacity: 0.7, marginBottom: "8px" }}>
                                {parsedData.embeds.length} Embed(s)
                            </BaseText>
                            {parsedData.embeds.map((embed, i) => (
                                <div key={i} style={{
                                    padding: "12px",
                                    background: "var(--background-tertiary)",
                                    borderRadius: "6px",
                                    borderLeft: `4px solid ${embed.color || '#5865f2'}`,
                                    marginTop: i > 0 ? "8px" : "0"
                                }}>
                                    {embed.author && (
                                        <Flex style={{ gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                                            {embed.author.iconURL && (
                                                <img src={embed.author.iconProxyURL || embed.author.iconURL} alt="" style={{ width: "20px", height: "20px", borderRadius: "50%" }} />
                                            )}
                                            <BaseText style={{ fontSize: "12px", fontWeight: "600" }}>{embed.author.name}</BaseText>
                                        </Flex>
                                    )}
                                    {embed.title && <BaseText weight="semibold">{embed.title}</BaseText>}
                                    {embed.rawDescription && <BaseText style={{ fontSize: "13px", marginTop: "4px" }}>{embed.rawDescription.substring(0, 200)}...</BaseText>}
                                    {embed.image && (
                                        <img src={embed.image.proxyURL || embed.image.url} alt="" style={{ maxWidth: "100%", borderRadius: "4px", marginTop: "8px" }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {parsedData.attachments?.length > 0 && (
                        <Flex style={{ gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                            <BaseText style={{ fontSize: "12px", opacity: 0.7 }}>
                                📎 {parsedData.attachments.length} attachment(s)
                            </BaseText>
                        </Flex>
                    )}

                    {parsedData.reactions?.length > 0 && (
                        <Flex style={{ gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                            {parsedData.reactions.map((reaction, i) => (
                                <div key={i} style={{
                                    background: "var(--background-tertiary)",
                                    padding: "4px 8px",
                                    borderRadius: "8px",
                                    border: reaction.me ? "2px solid var(--brand-500)" : "none"
                                }}>
                                    <Flex style={{ gap: "4px", alignItems: "center" }}>
                                        {reaction.emoji.id ? (
                                            <img src={`https://cdn.discordapp.com/emojis/${reaction.emoji.id}.png?size=20`} alt="" style={{ width: "16px", height: "16px" }} />
                                        ) : (
                                            <span>{reaction.emoji.name}</span>
                                        )}
                                        <BaseText style={{ fontSize: "12px", fontWeight: "600" }}>{reaction.count}</BaseText>
                                    </Flex>
                                </div>
                            ))}
                        </Flex>
                    )}

                    <BaseText style={{ opacity: 0.6, fontSize: "12px", marginTop: "12px" }}>
                        ID: {parsedData.id} • Type: {parsedData.type}
                    </BaseText>
                </div>
            );
        }

        // Role preview
        if (type === "Role") {
            return (
                <div style={{ padding: "20px", background: "var(--background-secondary)", borderRadius: "8px" }}>
                    <Flex style={{ gap: "12px", alignItems: "center", marginBottom: "12px" }}>
                        {parsedData.color && (
                            <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: parsedData.colorString || `#${parsedData.color.toString(16).padStart(6, '0')}`
                            }} />
                        )}
                        {parsedData.icon && (
                            <img
                                src={`https://cdn.discordapp.com/role-icons/${parsedData.id}/${parsedData.icon}.png?size=32`}
                                alt="Icon"
                                style={{ width: "32px", height: "32px", borderRadius: "50%" }}
                            />
                        )}
                        {parsedData.unicodeEmoji && (
                            <span style={{ fontSize: "32px" }}>{parsedData.unicodeEmoji}</span>
                        )}
                        <Heading style={{ color: parsedData.colorString || "inherit" }}>
                            {parsedData.name || "Unknown Role"}
                        </Heading>
                    </Flex>

                    {parsedData.description && (
                        <div style={{ padding: "12px", background: "var(--background-tertiary)", borderRadius: "6px", marginTop: "12px" }}>
                            <BaseText>{parsedData.description}</BaseText>
                        </div>
                    )}

                    <Flex style={{ gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                        {parsedData.hoist && (
                            <span style={{ background: "var(--background-tertiary)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
                                📌 Hoisted
                            </span>
                        )}
                        {parsedData.mentionable && (
                            <span style={{ background: "var(--background-tertiary)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
                                @ Mentionable
                            </span>
                        )}
                        {parsedData.managed && (
                            <span style={{ background: "var(--background-tertiary)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
                                🤖 Managed
                            </span>
                        )}
                    </Flex>

                    <BaseText style={{ opacity: 0.6, fontSize: "12px", marginTop: "12px" }}>
                        ID: {parsedData.id} • Position: {parsedData.position}
                    </BaseText>

                    {parsedData.permissions && (
                        <div style={{ marginTop: "12px", padding: "12px", background: "var(--background-tertiary)", borderRadius: "6px" }}>
                            <BaseText style={{ fontSize: "12px", fontFamily: "monospace", opacity: 0.8 }}>
                                Permissions: {parsedData.permissions}
                            </BaseText>
                        </div>
                    )}
                </div>
            );
        }

        // Generic preview
        return (
            <div style={{ padding: "20px", background: "var(--background-secondary)", borderRadius: "8px" }}>
                <Heading>{type} Preview</Heading>
                <pre style={{ marginTop: "12px", fontSize: "13px", lineHeight: "1.6", color: "var(--text-normal)", maxHeight: "400px", overflow: "auto" }}>
                    {JSON.stringify(parsedData, null, 2)}
                </pre>
            </div>
        );
    };

    return (
        <>
            <ModalHeader>
                <Flex style={{ flexGrow: 1, alignItems: "center", gap: "12px" }}>
                    <BaseText size="lg" weight="semibold">View Raw - {type}</BaseText>
                    {settings.store.showMetadata && (
                        <BaseText size="sm" style={{ opacity: 0.7 }}>
                            {metadata.size} • {metadata.properties} properties • {metadata.type}
                        </BaseText>
                    )}
                    {isEditing && (
                        <BaseText size="sm" style={{ color: "var(--brand-500)", fontWeight: "600" }}>
                            ✏️ EDITING
                        </BaseText>
                    )}
                </Flex>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <div style={{ padding: "16px 0" }}>
                    {settings.store.enableSearch && !isEditing && (
                        <div style={{ marginBottom: "16px" }}>
                            <input
                                type="text"
                                placeholder="Search in JSON..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    background: "var(--background-secondary)",
                                    border: "1px solid var(--background-tertiary)",
                                    borderRadius: "4px",
                                    color: "var(--text-normal)",
                                    fontSize: "14px"
                                }}
                            />
                        </div>
                    )}

                    {jsonError && (
                        <div style={{
                            padding: "12px",
                            background: "rgba(242, 63, 67, 0.1)",
                            border: "1px solid var(--status-danger)",
                            borderRadius: "4px",
                            marginBottom: "12px",
                            color: "var(--status-danger)"
                        }}>
                            ⚠️ JSON Error: {jsonError}
                        </div>
                    )}

                    <div style={{ marginBottom: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={activeTab === "json" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                            onClick={() => setActiveTab("json")}
                        >
                            {isEditing ? "Edit JSON" : "Raw JSON"}
                        </Button>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={activeTab === "formatted" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                            onClick={() => setActiveTab("formatted")}
                        >
                            Formatted
                        </Button>
                        {settings.store.enablePreview && (
                            <Button
                                size={Button.Sizes.SMALL}
                                color={activeTab === "preview" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                                onClick={() => setActiveTab("preview")}
                            >
                                Preview
                            </Button>
                        )}
                        {msgContent && (
                            <Button
                                size={Button.Sizes.SMALL}
                                color={activeTab === "content" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                                onClick={() => setActiveTab("content")}
                            >
                                Content
                            </Button>
                        )}
                    </div>

                    <div style={{ marginTop: "16px" }}>
                        {activeTab === "json" && (
                            isEditing ? (
                                <textarea
                                    value={editedJson}
                                    onChange={e => setEditedJson(e.target.value)}
                                    style={{
                                        width: "100%",
                                        minHeight: "400px",
                                        padding: "12px",
                                        background: "var(--background-secondary)",
                                        border: jsonError ? "2px solid var(--status-danger)" : "1px solid var(--background-tertiary)",
                                        borderRadius: "8px",
                                        color: "var(--text-normal)",
                                        fontSize: "13px",
                                        fontFamily: "monospace",
                                        resize: "vertical"
                                    }}
                                />
                            ) : (
                                <CodeBlock
                                    content={filteredJson}
                                    lang={settings.store.syntaxHighlight ? "json" : ""}
                                />
                            )
                        )}

                        {activeTab === "formatted" && parsedData && (
                            <div style={{
                                background: "var(--background-secondary)",
                                padding: "12px",
                                borderRadius: "8px",
                                maxHeight: "500px",
                                overflow: "auto"
                            }}>
                                <pre style={{ margin: 0, fontSize: "13px", lineHeight: "1.6", color: "var(--text-normal)" }}>
                                    {JSON.stringify(parsedData, null, settings.store.indentSize)}
                                </pre>
                            </div>
                        )}

                        {activeTab === "preview" && settings.store.enablePreview && renderPreview()}

                        {activeTab === "content" && msgContent && (
                            <>
                                <Heading>Content</Heading>
                                <CodeBlock content={msgContent} lang="" />
                            </>
                        )}
                    </div>
                </div>
            </ModalContent>

            <ModalFooter>
                <Flex style={{ gap: "8px", flexWrap: "wrap" }}>
                    {settings.store.enableEdit && (
                        <>
                            <Button
                                onClick={toggleEdit}
                                color={isEditing ? Button.Colors.RED : Button.Colors.BRAND}
                            >
                                {isEditing ? "Stop Editing" : "✏️ Edit JSON"}
                            </Button>
                            {isEditing && (
                                <Button onClick={resetEdit} color={Button.Colors.PRIMARY}>
                                    Reset
                                </Button>
                            )}
                        </>
                    )}
                    <Button onClick={() => copyWithToast(isEditing ? editedJson : json, `${type} JSON copied!`)}>
                        Copy JSON
                    </Button>
                    {msgContent && (
                        <Button onClick={() => copyWithToast(msgContent, "Content copied!")}>
                            Copy Content
                        </Button>
                    )}
                    {settings.store.enableExport && (
                        <Button onClick={handleExport} color={Button.Colors.GREEN}>
                            <DownloadIcon height={16} width={16} style={{ marginRight: "6px" }} />
                            Export
                        </Button>
                    )}
                </Flex>
            </ModalFooter>
        </>
    );
}

function openViewRawModal(json: string, type: string, msgContent?: string) {
    const parsedData = JSON.parse(json);
    saveToHistory(type, parsedData);

    const key = openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.LARGE}>
                <ViewRawModal
                    json={json}
                    type={type}
                    msgContent={msgContent}
                    onClose={() => closeModal(key)}
                />
            </ModalRoot>
        </ErrorBoundary>
    ));
}

function openViewRawModalMessage(msg: Message) {
    msg = cleanMessage(msg);
    const indentSize = settings.store.autoFormat ? settings.store.indentSize : 0;
    const msgJson = JSON.stringify(msg, null, indentSize);

    return openViewRawModal(msgJson, "Message", msg.content);
}

function MakeContextCallback(name: "Guild" | "Role" | "User" | "Channel"): NavContextMenuPatchCallback {
    return (children, props) => {
        const value = props[name.toLowerCase()];
        if (!value) return;
        if (props.label === getIntlMessage("CHANNEL_ACTIONS_MENU_LABEL")) return;

        const lastChild = children.at(-1);
        if (lastChild?.key === "developer-actions") {
            const p = lastChild.props;
            if (!Array.isArray(p.children))
                p.children = [p.children];

            children = p.children;
        }

        const id = `vc-view-${name.toLowerCase()}-raw`;
        const indentSize = settings.store.autoFormat ? settings.store.indentSize : 0;

        children.splice(-1, 0,
            <Menu.MenuItem
                id={id}
                label="View Raw (Enhanced)"
                action={() => openViewRawModal(JSON.stringify(value, null, indentSize), name)}
                icon={CopyIcon}
            />
        );
    };
}

const devContextCallback: NavContextMenuPatchCallback = (children, { id }: { id: string; }) => {
    const guild = getCurrentGuild();
    if (!guild) return;

    const role = GuildRoleStore.getRole(guild.id, id);
    if (!role) return;

    const indentSize = settings.store.autoFormat ? settings.store.indentSize : 0;

    children.push(
        <Menu.MenuItem
            id="vc-view-role-raw"
            label="View Raw (Enhanced)"
            action={() => openViewRawModal(JSON.stringify(role, null, indentSize), "Role")}
            icon={CopyIcon}
        />
    );
};

export default definePlugin({
    name: "ViewRawEnhanced",
    description: "Advanced raw data viewer with search, export, formatting, history, and metadata",
    authors: [Devs.KingFish, Devs.rz30, Devs.rad, Devs.ImLvna,],
    settings,

    contextMenus: {
        "guild-context": MakeContextCallback("Guild"),
        "guild-settings-role-context": MakeContextCallback("Role"),
        "channel-context": MakeContextCallback("Channel"),
        "thread-context": MakeContextCallback("Channel"),
        "gdm-context": MakeContextCallback("Channel"),
        "user-context": MakeContextCallback("User"),
        "dev-context": devContextCallback
    },

    messagePopoverButton: {
        icon: CopyIcon,
        render(msg) {
            const handleClick = () => {
                if (settings.store.clickMethod === "Right") {
                    copyWithToast(msg.content);
                } else {
                    openViewRawModalMessage(msg);
                }
            };

            const handleContextMenu = e => {
                if (settings.store.clickMethod === "Left") {
                    e.preventDefault();
                    e.stopPropagation();
                    copyWithToast(msg.content);
                } else {
                    e.preventDefault();
                    e.stopPropagation();
                    openViewRawModalMessage(msg);
                }
            };

            const label = settings.store.clickMethod === "Right"
                ? "Copy Raw (Left) / View Enhanced (Right)"
                : "View Enhanced (Left) / Copy Raw (Right)";

            return {
                label,
                icon: CopyIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: handleClick,
                onContextMenu: handleContextMenu
            };
        }
    }
});

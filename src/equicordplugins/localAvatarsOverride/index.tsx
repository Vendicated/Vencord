/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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
import { DataStore } from "@api/index";
import definePlugin from "@utils/types";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import {
    Button,
    Forms,
    Menu,
    React,
    Text,
    Toasts,
    UserStore,
} from "@webpack/common";

// ─── Types ───

interface AvatarOverride {
    userId: string;
    url: string;
    label: string;
    originalUrl: string;
}

// ─── DataStore ───

const DS_KEY = "LocalAvatars_overrides";

async function getOverrides(): Promise<Record<string, AvatarOverride>> {
    return (await DataStore.get<Record<string, AvatarOverride>>(DS_KEY)) ?? {};
}

async function setOverride(userId: string, url: string, label: string, originalUrl: string) {
    const all = await getOverrides();
    const existing = all[userId];
    all[userId] = { userId, url, label, originalUrl: existing?.originalUrl ?? originalUrl };
    await DataStore.set(DS_KEY, all);
    overridesCache = all;
}

async function removeOverride(userId: string) {
    const all = await getOverrides();
    delete all[userId];
    await DataStore.set(DS_KEY, all);
    overridesCache = all;
}

let overridesCache: Record<string, AvatarOverride> = {};

async function loadCache() {
    overridesCache = await getOverrides();
}

// ─── File → data URL ───

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ─── Input style ───

const inputStyle: React.CSSProperties = {
    flex: 1,
    background: "var(--input-background, #1e1f22)",
    border: "1px solid var(--background-modifier-accent)",
    borderRadius: "8px",
    color: "#dbdee1",
    caretColor: "#dbdee1",
    WebkitTextFillColor: "#dbdee1",
    padding: "9px 12px",
    fontSize: "14px",
    outline: "none",
};

// ─── Styles ───

const styles: Record<string, React.CSSProperties> = {
    previewRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        margin: "8px 0",
    },
    previewBox: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
    },
    previewLabel: {
        fontSize: "11px",
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
    },
    avatar: {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        objectFit: "cover",
        border: "3px solid var(--background-modifier-accent)",
    },
    avatarActive: {
        border: "3px solid var(--brand-experiment)",
        boxShadow: "0 0 12px var(--brand-experiment-30a)",
    },
    arrow: {
        fontSize: "24px",
        color: "var(--text-muted)",
        marginTop: "20px",
    },
    section: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    sectionLabel: {
        fontSize: "12px",
        fontWeight: 600,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
    },
    inputRow: {
        display: "flex",
        gap: "8px",
    },
    dropZone: {
        border: "2px dashed var(--background-modifier-accent)",
        borderRadius: "10px",
        padding: "24px",
        textAlign: "center",
        cursor: "pointer",
        transition: "border-color .15s, background .15s",
        userSelect: "none",
    },
    dropZoneActive: {
        borderColor: "var(--brand-experiment)",
        background: "var(--brand-experiment-10a)",
    },
    overrideRow: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 14px",
        background: "var(--background-secondary-alt)",
        borderRadius: "10px",
        border: "1px solid var(--background-modifier-accent)",
        marginBottom: "8px",
    },
    overrideAvatar: {
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
    },
};

// ─── Modal ───

function AvatarModal({ userId, modalProps }: { userId: string; modalProps: any; }) {
    const user = UserStore.getUser(userId);
    const username = user?.username ?? userId;

    const avatarHash = (user as any)?.avatar ?? "";
    const originalAvatar: string = overridesCache[userId]?.originalUrl
        ?? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.webp?size=128`

    const [urlInput, setUrlInput] = React.useState("");
    const [preview, setPreview] = React.useState<string | null>(
        overridesCache[userId]?.url ?? null
    );
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    async function applyUrl(url: string, label: string) {
        const trimmed = url.trim();
        if (!trimmed) return;
        await setOverride(userId, trimmed, label, originalAvatar);
        setPreview(trimmed);
        Toasts.show({
            message: `@${username}'s avatar changed!`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
        });
    }

    async function handleFile(file: File) {
        if (!file.type.startsWith("image/")) {
            Toasts.show({
                message: "Image files only (png, jpg, gif, webp)!",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
            });
            return;
        }
        await applyUrl(await fileToDataUrl(file), file.name);
    }

    async function handleRemove() {
        await removeOverride(userId);
        setPreview(null);
        Toasts.show({
            message: `Original avatar restored for @${username}`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
        });
    }

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader separator={false}>
                <Text variant="heading-lg/semibold" style={{ flex: 1 }}>
                    LocalAvatarsOverride - @{username}
                </Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "8px" }}>

                {/* Preview */}
                <div style={styles.previewRow}>
                    <div style={styles.previewBox}>
                        <span style={styles.previewLabel}>Original</span>
                        <img src={originalAvatar} style={styles.avatar} alt="original" />
                    </div>
                    <span style={styles.arrow}>→</span>
                    <div style={styles.previewBox}>
                        <span style={styles.previewLabel}>Local</span>
                        <img
                            src={preview ?? originalAvatar}
                            style={{ ...styles.avatar, ...(preview ? styles.avatarActive : {}) }}
                            alt="local"
                        />
                    </div>
                </div>

                {/* URL input */}
                <div style={styles.section}>
                    <span style={styles.sectionLabel}>Avatar's link (URL)</span>
                    <div style={styles.inputRow}>
                        <input
                            style={inputStyle}
                            placeholder="https://i.imgur.com/..."
                            value={urlInput}
                            onChange={e => setUrlInput(e.currentTarget.value)}
                            onKeyDown={e => e.key === "Enter" && applyUrl(urlInput, urlInput)}
                        />
                        <Button onClick={() => applyUrl(urlInput, urlInput)}>
                            Set
                        </Button>
                    </div>
                </div>

                {/* Drag & drop / upload */}
                <div
                    style={{ ...styles.dropZone, ...(isDragging ? styles.dropZoneActive : {}) }}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Text style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                        {isDragging ? "Drop here!" : "⬆Drag the file or click to select"}
                    </Text>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={e => {
                            const file = e.currentTarget.files?.[0];
                            if (file) handleFile(file);
                            e.currentTarget.value = "";
                        }}
                    />
                </div>

            </ModalContent>

            <ModalFooter style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                    {preview && (
                        <Button color={Button.Colors.RED} onClick={handleRemove}>
                            Reset avatar
                        </Button>
                    )}
                </div>
                <Button color={Button.Colors.TRANSPARENT} onClick={modalProps.onClose}>
                    Close
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

// ─── Context menu ───

const userContextPatch: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user?.id) return;
    const hasOverride = !!overridesCache[user.id];

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuItem
            id="local-avatar-set"
            label={hasOverride ? "Change avatar" : "Set avatar"}
            action={() => openModal(props => <AvatarModal userId={user.id} modalProps={props} />)}
        />,
        hasOverride
            ? <Menu.MenuItem
                id="local-avatar-remove"
                label="Delete avatar"
                color="danger"
                action={async () => { await removeOverride(user.id); }}
            />
            : null
    );
};

// ─── Settings panel ───

function SettingsPanel() {
    const [overrides, setOverrides] = React.useState<Record<string, AvatarOverride>>({});
    const [manualId, setManualId] = React.useState("");

    React.useEffect(() => { getOverrides().then(setOverrides); }, []);

    async function refresh() {
        const o = await getOverrides();
        overridesCache = o;
        setOverrides({ ...o });
    }

    async function handleDelete(userId: string) {
        await removeOverride(userId);
        refresh();
    }

    function openFor(id: string) {
        if (!id.trim()) return;
        openModal(props => (
            <AvatarModal userId={id.trim()} modalProps={{ ...props, onClose: () => { props.onClose(); refresh(); } }} />
        ));
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Forms.FormTitle>LocalAvatars - management</Forms.FormTitle>
            <Forms.FormText>
                Right-click on a user → "Set avatar", or enter an ID below and click Open.
            </Forms.FormText>

            <div style={{ display: "flex", gap: "8px" }}>
                <input
                    style={inputStyle}
                    placeholder="User ID (e.g. 123456789012345678)"
                    value={manualId}
                    onChange={e => setManualId(e.currentTarget.value)}
                    onKeyDown={e => e.key === "Enter" && openFor(manualId)}
                />
                <Button onClick={() => openFor(manualId)}>Open</Button>
            </div>

            <Forms.FormDivider />
            <Forms.FormTitle>Active overrides ({Object.keys(overrides).length})</Forms.FormTitle>

            {Object.keys(overrides).length === 0 && (
                <Forms.FormText style={{ color: "var(--text-muted)" }}>
                    No overrides yet. Right-click on a user to add one.
                </Forms.FormText>
            )}

            {Object.values(overrides).map(o => {
                const user = UserStore.getUser(o.userId);
                return (
                    <div key={o.userId} style={styles.overrideRow}>
                        <img src={o.url} style={styles.overrideAvatar} alt="" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontWeight: 600, color: "var(--header-primary)" }}>
                                {user?.username ?? o.userId}
                            </Text>
                            <Text style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {o.label.length > 60 ? o.label.slice(0, 57) + "…" : o.label}
                            </Text>
                        </div>
                        <Button
                            size={Button.Sizes.SMALL}
                            onClick={() => openFor(o.userId)}
                        >
                            Edit
                        </Button>
                        <Button
                            color={Button.Colors.RED}
                            size={Button.Sizes.SMALL}
                            onClick={() => handleDelete(o.userId)}
                        >
                            Delete
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Plugin ───

export default definePlugin({
    name: "LocalAvatarsOverride",
    description: "Replaces user avatars locally (only you can see them). Supports URLs and file uploads.",
    authors: [{ name: "sketchmyname", id: 1412164910443663491n }],

    settingsAboutComponent: SettingsPanel,

    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
    },

    patches: [
        {
            find: "getUserAvatarURL:",
            replacement: {
                match: /getUserAvatarURL:(\i)/,
                replace: "getUserAvatarURL:$self.patchGetAvatarURL($1)",
            },
            required: true,
        },
        {
            find: ".fromAnimatedAvatar",
            replacement: {
                match: /src:(\i)\.getAvatarURL\((\i),(\i),(\i)\)/g,
                replace: "src:$self.getLocalOrOriginalAvatar($1,$2,$3,$4)",
            },
        },
    ],

    patchGetAvatarURL(originalFn: Function) {
        return (user: any, guildId?: string, size?: number, animated?: boolean) => {
            const override = overridesCache[user?.id];
            if (override) return override.url;
            return originalFn(user, guildId, size, animated);
        };
    },

    getLocalOrOriginalAvatar(user: any, guildId?: string, size?: number, animated?: boolean) {
        const override = overridesCache[user?.id];
        if (override) return override.url;
        return (user as any)?.getAvatarURL?.(guildId, size, animated) ?? "";
    },

    async start() {
        await loadCache();
    },

    stop() {
        overridesCache = {};
    },
});

/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import ErrorBoundary from "@components/ErrorBoundary";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, TabBar, Text, TextInput, Toasts, useRef, useState } from "@webpack/common";

import { getSoundEntries, saveSoundEntries, SoundEntry } from "./settings";

function convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function openSoundSettingsModal() {
    openModal(props =>
        <ErrorBoundary>
            <SoundSettingsModal modalProps={props} />
        </ErrorBoundary>
    );
}

function SoundSettingsModal({ modalProps }: { modalProps: ModalProps; }) {
    const [currentTab, setCurrentTab] = useState<"users" | "guilds">("users");
    const [entries, setEntries] = useState<SoundEntry[]>(getSoundEntries());

    const [userForm, setUserForm] = useState({ userId: "", displayName: "", userLabel: "", soundUrl: "", filename: "", volume: 0.5 });
    const [useDisplayNameMode, setUseDisplayNameMode] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const userFileInputRef = useRef<HTMLInputElement>(null);

    const [guildForm, setGuildForm] = useState({ guildId: "", guildName: "", soundUrl: "", filename: "", volume: 0.5 });
    const [editingGuildId, setEditingGuildId] = useState<string | null>(null);
    const guildFileInputRef = useRef<HTMLInputElement>(null);

    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const saveEntries = (newEntries: SoundEntry[]) => {
        setEntries(newEntries);
        saveSoundEntries(newEntries);
    };

    const playSound = (soundUrl: string, volume: number, entryId: string) => {
        if (playingId === entryId && audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            setPlayingId(null);
            return;
        }

        if (!audioRef.current) {
            audioRef.current = new Audio();
        }

        audioRef.current.src = soundUrl;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(err => console.error("Error playing sound:", err));
        setPlayingId(entryId);

        audioRef.current.onended = () => {
            setPlayingId(null);
        };
    };

    const handleAddOrUpdateUser = () => {
        if (useDisplayNameMode) {
            if (!userForm.displayName || !userForm.soundUrl) {
                return;
            }
        } else {
            if (!userForm.userId || !userForm.soundUrl) {
                return;
            }
        }

        let newEntries: SoundEntry[];
        if (editingUserId) {
            newEntries = entries.map(entry =>
                entry.id === editingUserId
                    ? {
                        ...entry,
                        userId: userForm.userId.trim(),
                        displayName: userForm.displayName.trim(),
                        userLabel: userForm.userLabel.trim(),
                        soundUrl: userForm.soundUrl.trim(),
                        filename: userForm.filename,
                        volume: userForm.volume
                    }
                    : entry
            );
            setEditingUserId(null);
        } else {
            const newEntry: SoundEntry = {
                id: `user_${Date.now()}`,
                type: "user",
                userId: userForm.userId.trim(),
                displayName: userForm.displayName.trim(),
                userLabel: userForm.userLabel.trim(),
                guildId: "",
                guildName: "",
                soundUrl: userForm.soundUrl.trim(),
                filename: userForm.filename,
                volume: userForm.volume
            };
            newEntries = [...entries, newEntry];
        }

        saveEntries(newEntries);
        setUserForm({ userId: "", displayName: "", userLabel: "", soundUrl: "", filename: "", volume: 0.5 });
        setUseDisplayNameMode(false);
    };

    const handleEditUser = (entry: SoundEntry) => {
        setUserForm({
            userId: entry.userId.trim(),
            displayName: entry.displayName?.trim() || "",
            userLabel: entry.userLabel?.trim() || "",
            soundUrl: entry.soundUrl.trim(),
            filename: entry.filename || "",
            volume: entry.volume
        });
        setUseDisplayNameMode(!!entry.displayName && !entry.userId);
        setEditingUserId(entry.id);
    };

    const handleUserFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            Toasts.show({
                message: "File size too large! Maximum 10MB",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId()
            });
            return;
        }

        try {
            const base64 = await convertFileToBase64(file);
            setUserForm(prev => ({ ...prev, soundUrl: base64, filename: file.name }));
        } catch (error) {
            Toasts.show({
                message: "Error reading file",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId()
            });
            console.error("File upload error:", error);
        }

        if (userFileInputRef.current) {
            userFileInputRef.current.value = "";
        }
    };

    const handleAddOrUpdateGuild = () => {
        if (!guildForm.guildId || !guildForm.soundUrl) {
            return;
        }

        let newEntries: SoundEntry[];
        if (editingGuildId) {
            newEntries = entries.map(entry =>
                entry.id === editingGuildId
                    ? {
                        ...entry,
                        guildId: guildForm.guildId.trim(),
                        guildName: guildForm.guildName.trim(),
                        soundUrl: guildForm.soundUrl.trim(),
                        filename: guildForm.filename,
                        volume: guildForm.volume
                    }
                    : entry
            );
            setEditingGuildId(null);
        } else {
            const newEntry: SoundEntry = {
                id: `guild_${Date.now()}`,
                type: "guild",
                userId: "",
                guildId: guildForm.guildId.trim(),
                guildName: guildForm.guildName.trim(),
                soundUrl: guildForm.soundUrl.trim(),
                filename: guildForm.filename,
                volume: guildForm.volume
            };
            newEntries = [...entries, newEntry];
        }

        saveEntries(newEntries);
        setGuildForm({ guildId: "", guildName: "", soundUrl: "", filename: "", volume: 0.5 });
    };

    const handleEditGuild = (entry: SoundEntry) => {
        setGuildForm({
            guildId: entry.guildId.trim(),
            guildName: entry.guildName ? entry.guildName.trim() : "",
            soundUrl: entry.soundUrl.trim(),
            filename: entry.filename || "",
            volume: entry.volume
        });
        setEditingGuildId(entry.id);
    };

    const handleGuildFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            Toasts.show({
                message: "File size too large! Maximum 10MB",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId()
            });
            return;
        }

        try {
            const base64 = await convertFileToBase64(file);
            setGuildForm(prev => ({ ...prev, soundUrl: base64, filename: file.name }));
        } catch (error) {
            Toasts.show({
                message: "Error reading file",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId()
            });
            console.error("File upload error:", error);
        }

        if (guildFileInputRef.current) {
            guildFileInputRef.current.value = "";
        }
    };

    const handleDelete = (id: string) => {
        const newEntries = entries.filter(entry => entry.id !== id);
        saveEntries(newEntries);
    };

    const userEntries = entries.filter(e => e.type === "user");
    const guildEntries = entries.filter(e => e.type === "guild");

    return (<>
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>
                    Better Notifications
                </Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent>
                <TabBar
                    type="top"
                    look="brand"
                    selectedItem={currentTab}
                    onItemSelect={setCurrentTab}
                >
                    <TabBar.Item id="users">
                        Users ({userEntries.length})
                    </TabBar.Item>
                    <TabBar.Item id="guilds">
                        Servers ({guildEntries.length})
                    </TabBar.Item>
                </TabBar>

                <div style={{ marginTop: "16px" }}>
                    {currentTab === "users" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{
                                padding: "12px",
                                backgroundColor: "var(--background-secondary)",
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px"
                            }}>
                                <Text variant="heading-md/semibold">
                                    {editingUserId ? "Edit User Sound" : "Add User Sound"}
                                </Text>

                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                                        <div style={{ flex: 1 }}>
                                            <TextInput
                                                placeholder={useDisplayNameMode ? "Display Name (required)" : "User ID (required)"}
                                                value={useDisplayNameMode ? userForm.displayName : userForm.userId}
                                                onChange={val => setUserForm(prev => useDisplayNameMode
                                                    ? { ...prev, displayName: val }
                                                    : { ...prev, userId: val }
                                                )}
                                            /></div>

                                        <Button
                                            onClick={() => setUseDisplayNameMode(!useDisplayNameMode)}
                                            color={useDisplayNameMode ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                                            size={Button.Sizes.MEDIUM}
                                        >
                                            {useDisplayNameMode ? "Back to User ID" : "Can't get User ID?"}
                                        </Button>
                                    </div>
                                    <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", marginLeft: "4px" }}>
                                        {useDisplayNameMode
                                            ? "User's display name (e.g., Bobs)"
                                            : "Enable Developer Mode → Right-click user → Copy User ID."
                                        }
                                    </Text>
                                    {
                                        useDisplayNameMode ? null : (
                                            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", marginLeft: "4px" }}>
                                                Enable Developer Mode: Settings → Advanced → Developer Mode (ON)
                                            </Text>
                                        )
                                    }
                                    {useDisplayNameMode && (
                                        <div style={{
                                            padding: "8px",
                                            backgroundColor: "var(--background-tertiary)",
                                            borderRadius: "4px",
                                            borderLeft: "3px solid var(--status-warning)"
                                        }}>
                                            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                                                ⚠️ Display names are not unique and may match multiple users. Using User ID is recommended.
                                            </Text>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <TextInput
                                        placeholder="Custom Label (optional, for display only)"
                                        value={userForm.userLabel}
                                        onChange={val => setUserForm(prev => ({ ...prev, userLabel: val }))}
                                    />
                                </div>

                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <input
                                        ref={userFileInputRef}
                                        type="file"
                                        accept="audio/*"
                                        style={{ display: "none" }}
                                        onChange={handleUserFileUpload}
                                    />
                                    <Button
                                        onClick={() => userFileInputRef.current?.click()}
                                        color={Button.Colors.PRIMARY}
                                        size={Button.Sizes.SMALL}
                                        style={{ flex: "0 0 auto" }}
                                    >
                                        Upload Sound
                                    </Button>
                                    <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", flex: 1 }}>
                                        {userForm.filename
                                            ? `${userForm.filename}`
                                            : userForm.soundUrl && !userForm.soundUrl.startsWith("data:")
                                                ? "URL set"
                                                : "No sound selected"}
                                    </Text>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <Text variant="text-sm/normal" style={{ minWidth: "60px" }}>
                                            Volume: {(userForm.volume * 100).toFixed(0)}%
                                        </Text>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={userForm.volume}
                                            onChange={val => setUserForm(prev => ({ ...prev, volume: parseFloat(val.target.value) }))}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "8px" }}>
                                    <Button
                                        onClick={handleAddOrUpdateUser}
                                        color={Button.Colors.BRAND}
                                        size={Button.Sizes.SMALL}
                                        disabled={useDisplayNameMode ? (!userForm.displayName || !userForm.soundUrl) : (!userForm.userId || !userForm.soundUrl)}
                                    >
                                        {editingUserId ? "Update" : "Add"}
                                    </Button>

                                    {editingUserId && (
                                        <Button
                                            onClick={() => {
                                                setUserForm({ userId: "", displayName: "", userLabel: "", soundUrl: "", filename: "", volume: 0.5 });
                                                setUseDisplayNameMode(false);
                                                setEditingUserId(null);
                                            }}
                                            color={Button.Colors.PRIMARY}
                                            size={Button.Sizes.SMALL}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {userEntries.length === 0 ? (
                                <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                                    No user sounds configured yet.
                                </Text>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {userEntries.map(entry => (
                                        <div
                                            key={entry.id}
                                            style={{
                                                padding: "10px",
                                                backgroundColor: "var(--background-secondary)",
                                                borderRadius: "6px",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center"
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Text variant="text-md/semibold">
                                                    {entry.userLabel || (entry.userId ? (entry.displayName || entry.userId) : entry.displayName)}
                                                </Text>
                                                <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                                                    {entry.userId ? `ID: ${entry.userId}` : `Display Name: ${entry.displayName}`}
                                                </Text>
                                                <Text variant="text-xs/normal" style={{
                                                    color: "var(--text-muted)",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap"
                                                }}>
                                                    file: {entry.filename || (entry.soundUrl.startsWith("data:") ? "Uploaded file" : entry.soundUrl.substring(0, 40))}
                                                    {!entry.filename && entry.soundUrl.length > 40 && !entry.soundUrl.startsWith("data:") ? "..." : ""}
                                                </Text>
                                                <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                                                    Volume: {(entry.volume * 100).toFixed(0)}%
                                                </Text>
                                            </div>

                                            <div style={{ display: "flex", gap: "4px", marginLeft: "8px" }}>
                                                <Button
                                                    onClick={() => playSound(entry.soundUrl, entry.volume, entry.id)}
                                                    color={Button.Colors.PRIMARY}
                                                    size={Button.Sizes.SMALL}
                                                >
                                                    {playingId === entry.id ? "⏸ Stop" : "▶ Play"}
                                                </Button>
                                                <Button
                                                    onClick={() => handleEditUser(entry)}
                                                    color={Button.Colors.PRIMARY}
                                                    size={Button.Sizes.SMALL}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    onClick={() => handleDelete(entry.id)}
                                                    color={Button.Colors.RED}
                                                    size={Button.Sizes.SMALL}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{
                                padding: "12px",
                                backgroundColor: "var(--background-secondary)",
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px"
                            }}>
                                <Text variant="heading-md/semibold">
                                    {editingGuildId ? "Edit Server Sound" : "Add Server Sound"}
                                </Text>

                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <TextInput
                                        placeholder="Server ID (required)"
                                        value={guildForm.guildId}
                                        onChange={val => setGuildForm(prev => ({ ...prev, guildId: val }))}
                                    />
                                    <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", marginLeft: "4px" }}>
                                        Enable Developer Mode → Right-click server → Copy Server ID
                                    </Text>
                                </div>

                                <TextInput
                                    placeholder="Custom Label (optional, for display only)"
                                    value={guildForm.guildName}
                                    onChange={val => setGuildForm(prev => ({ ...prev, guildName: val }))}
                                />

                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <input
                                        ref={guildFileInputRef}
                                        type="file"
                                        accept="audio/*"
                                        style={{ display: "none" }}
                                        onChange={handleGuildFileUpload}
                                    />
                                    <Button
                                        onClick={() => guildFileInputRef.current?.click()}
                                        color={Button.Colors.PRIMARY}
                                        size={Button.Sizes.SMALL}
                                        style={{ flex: "0 0 auto" }}
                                    >
                                        Upload Sound
                                    </Button>
                                    <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", flex: 1 }}>
                                        {guildForm.filename
                                            ? `${guildForm.filename}`
                                            : guildForm.soundUrl && !guildForm.soundUrl.startsWith("data:")
                                                ? "URL set"
                                                : "No sound selected"}
                                    </Text>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <Text variant="text-sm/normal" style={{ minWidth: "60px" }}>
                                            Volume: {(guildForm.volume * 100).toFixed(0)}%
                                        </Text>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={guildForm.volume}
                                            onChange={val => setGuildForm(prev => ({ ...prev, volume: parseFloat(val.target.value) }))}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "8px" }}>
                                    <Button
                                        onClick={handleAddOrUpdateGuild}
                                        color={Button.Colors.BRAND}
                                        size={Button.Sizes.SMALL}
                                        disabled={!guildForm.guildId || !guildForm.soundUrl}
                                    >
                                        {editingGuildId ? "Update" : "Add"}
                                    </Button>

                                    {editingGuildId && (
                                        <Button
                                            onClick={() => {
                                                setGuildForm({ guildId: "", guildName: "", soundUrl: "", filename: "", volume: 0.5 });
                                                setEditingGuildId(null);
                                            }}
                                            color={Button.Colors.PRIMARY}
                                            size={Button.Sizes.SMALL}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {guildEntries.length === 0 ? (
                                <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                                    No server sounds configured yet.
                                </Text>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {guildEntries.map(entry => (
                                        <div
                                            key={entry.id}
                                            style={{
                                                padding: "10px",
                                                backgroundColor: "var(--background-secondary)",
                                                borderRadius: "6px",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center"
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Text variant="text-md/semibold">
                                                    {entry.guildName || entry.guildId}
                                                </Text>
                                                {entry.guildName && (
                                                    <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                                                        ID: {entry.guildId}
                                                    </Text>
                                                )}
                                                <Text variant="text-xs/normal" style={{
                                                    color: "var(--text-muted)",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap"
                                                }}>
                                                    file: {entry.filename || (entry.soundUrl.startsWith("data:") ? "Uploaded file" : entry.soundUrl.substring(0, 40))}
                                                    {!entry.filename && entry.soundUrl.length > 40 && !entry.soundUrl.startsWith("data:") ? "..." : ""}
                                                </Text>
                                                <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                                                    Volume: {(entry.volume * 100).toFixed(0)}%
                                                </Text>
                                            </div>

                                            <div style={{ display: "flex", gap: "4px", marginLeft: "8px" }}>
                                                <Button
                                                    onClick={() => playSound(entry.soundUrl, entry.volume, entry.id)}
                                                    color={Button.Colors.PRIMARY}
                                                    size={Button.Sizes.SMALL}
                                                >
                                                    {playingId === entry.id ? "⏸ Stop" : "▶ Play"}
                                                </Button>
                                                <Button
                                                    onClick={() => handleEditGuild(entry)}
                                                    color={Button.Colors.PRIMARY}
                                                    size={Button.Sizes.SMALL}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    onClick={() => handleDelete(entry.id)}
                                                    color={Button.Colors.RED}
                                                    size={Button.Sizes.SMALL}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{
                    marginTop: "16px",
                    padding: "12px",
                    backgroundColor: "var(--background-tertiary)",
                    borderRadius: "8px"
                }}>
                    <Text variant="text-sm/semibold">Tips:</Text>
                    <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", fontSize: "12px", color: "var(--text-muted)" }}>
                        <li><strong>Get User ID:</strong> Right-click on a user → Copy User ID (Developer Mode ON)</li>
                        <li><strong>Get Server ID:</strong> Right-click on a server icon → Copy Server ID (Developer Mode ON)</li>
                        <li><strong>Users Tab (User ID Mode):</strong> Set custom sounds for specific users by their unique User ID</li>
                        <li><strong>Users Tab (Display Name Mode):</strong> Optional alternative - match by display name (not unique, not recommended)</li>
                        <li><strong>Toggle Button:</strong> Switch between User ID and Display Name matching modes</li>
                        <li><strong>Servers Tab:</strong> Set default sounds for entire servers by Server ID</li>
                        <li><strong>Server Name:</strong> Optional label for your convenience (not used for matching)</li>
                        <li><strong>Upload Sound:</strong> Upload MP3, WAV, OGG (max 10MB)</li>
                        <li><strong>Volume:</strong> Each sound has its own volume control (0-100%)</li>
                        <li><strong>Priority Order:</strong> User ID → Display Name → User wildcard "*" (message from DMs) | Guild ID → Guild wildcard "*" (message from servers)</li>
                        <li><strong>Wildcard:</strong> Use "*" as User ID or Server ID to set a default fallback for unmatched notifications (it will replace the default Discord notification sound)</li>
                    </ul>
                </div>
            </ModalContent>

            <ModalFooter>
                <Button onClick={modalProps.onClose}>Close</Button>
            </ModalFooter>
        </ModalRoot >
    </>);
}

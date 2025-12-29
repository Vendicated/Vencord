/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { Grid } from "@components/Grid";
import { HeadingPrimary, HeadingSecondary, HeadingTertiary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Span } from "@components/Span";
import { fetchUserProfile } from "@utils/discord";
import { IS_MAC, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/index";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelType } from "@vencord/discord-types/enums";
import { findByPropsLazy } from "@webpack";
import { Avatar, Menu, SearchableSelect, showToast, TextInput, Toasts, useReducer, useRef, UserStore, useState, useStateFromStores, VoiceStateStore } from "@webpack/common";

const MediaEngineActions = findByPropsLazy("setLocalVolume");
const MediaEngineStore = findByPropsLazy("getLocalVolume");

const appliedUsers = new Set<string>();
const dataStoreKey = "volumePresets_presets";
let cachedPresets: Record<string, VolumePreset> = {};

interface VolumePreset {
    name: string;
    volumes: Record<string, number>;
}

interface QuickPresets {
    "1": string;
    "2": string;
    "3": string;
    "4": string;
}

const settings = definePluginSettings({
    currentPreset: {
        type: OptionType.STRING,
        description: "",
        default: "none",
        hidden: true
    },
    // Removed to switch to dataStore storage
    // presets: {
    //     type: OptionType.CUSTOM,
    //     default: {} as Record<string, VolumePreset>,
    //     hidden: true
    // },
    quickPresets: {
        type: OptionType.CUSTOM,
        default: { "1": "none", "2": "none", "3": "none", "4": "none" } as QuickPresets,
        hidden: true
    },
    managePresets: {
        type: OptionType.COMPONENT,
        component: PresetManager
    },
});

async function loadPresets() {
    cachedPresets = await DataStore.get(dataStoreKey) ?? {};
    return cachedPresets;
}
async function savePresets() {
    await DataStore.set(dataStoreKey, cachedPresets);
}
function getPresets() {
    return cachedPresets;
}
function getPreset(key: string) {
    return cachedPresets[key];
}
function setPreset(key: string, preset: VolumePreset) {
    cachedPresets[key] = preset;
    savePresets();
}
function deletePreset(deleteKey: string, setSelectedQuickPreset?) {
    delete cachedPresets[deleteKey];
    Object.keys(settings.store.quickPresets).forEach(key => {
        if (settings.store.quickPresets[key] === deleteKey) {
            settings.store.quickPresets[key] = "none";
            setSelectedQuickPreset(prev => ({
                ...prev,
                [key]: "none"
            }));
        }
    });
    savePresets();
}

function createPresetKey(name: string): string {
    return name.trim().toLocaleLowerCase().replaceAll(" ", "_");
}
function addUserToPreset(userID: string, presetKey: string, volume?: number) {
    const currentVolume = MediaEngineStore.getLocalVolume(userID);
    getPreset(presetKey).volumes[userID] = volume === undefined ? currentVolume : volume;
}
function removeUserFromPreset(userID: string, presetKey: string) {
    delete getPreset(presetKey).volumes[userID];
}
function applyPreset(preset: VolumePreset) {
    Object.entries(preset.volumes).forEach(([userID, volume]) => {
        MediaEngineActions.setLocalVolume(userID, volume);
    });
}
function applyPresetToUser(preset: VolumePreset, userID: string) {
    if (appliedUsers.has(userID)) {
        return;
    }
    const volume = preset.volumes[userID];
    if (volume !== undefined) {
        MediaEngineActions.setLocalVolume(userID, volume);
        appliedUsers.add(userID);
    }
}
function disablePreset() {
    settings.store.currentPreset = "none";
    appliedUsers.clear();
}

function PresetManager() {
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    const presetKeys = Object.keys(getPresets());
    const [expandedPresets, setExpandedPresets] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState(settings.store.currentPreset);
    const inputRef = useRef<HTMLInputElement>(null);
    const [renamingPreset, setRenamingPreset] = useState<string | null>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const [selectedQuickPreset, setSelectedQuickPreset] = useState(settings.store.quickPresets);

    useStateFromStores([UserStore], () => ({}));

    const togglePreset = async (presetKey: string) => {
        const newExpanded = new Set(expandedPresets);
        if (newExpanded.has(presetKey)) {
            newExpanded.delete(presetKey);
        } else {
            newExpanded.add(presetKey);

            const userIds = Object.keys(getPreset(presetKey).volumes);
            for (const userId of userIds) {
                if (!UserStore.getUser(userId)) {
                    try {
                        await fetchUserProfile(userId);
                    } catch (e) {
                        console.log(`[VolumePresets] Failed to fetch user ${userId}:`, e);
                    }
                }
            }
        }
        setExpandedPresets(newExpanded);
    };

    function renamePreset(oldPresetKey: string, newName: string) {
        const newPresetKey = createPresetKey(newName);
        if (Object.keys(getPresets()).findIndex(v => v === newPresetKey) > -1) {
            showToast("Preset name already in use", Toasts.Type.FAILURE);
            return;
        }
        getPresets()[newPresetKey] = getPresets()[oldPresetKey];
        getPresets()[newPresetKey].name = newName;
        delete getPresets()[oldPresetKey];
        if (settings.store.currentPreset === oldPresetKey) {
            settings.store.currentPreset = newPresetKey;
            setSelected(newPresetKey);
        }
        Object.keys(settings.store.quickPresets).forEach(key => {
            if (settings.store.quickPresets[key] === oldPresetKey) {
                settings.store.quickPresets[key] = newPresetKey;
                setSelectedQuickPreset(prev => ({
                    ...prev,
                    [key]: newPresetKey
                }));
            }
        });
        forceUpdate();
    }

    function createNewPreset() {
        if (inputRef.current != null && inputRef.current.value !== "") {
            const name = inputRef.current.value;
            const presetKey = createPresetKey(inputRef.current.value);

            if (presetKey === "" || presetKey === "none") {
                showToast("Invalid Preset Name", Toasts.Type.FAILURE);
                return;
            }
            if (Object.keys(getPresets()).findIndex(v => v === presetKey) > -1) {
                showToast("Preset name already in use", Toasts.Type.FAILURE);
                return;
            }

            const preset: VolumePreset = { name: name, volumes: {} };
            setPreset(presetKey, preset);
            inputRef.current.value = "";
            forceUpdate();
        } else {
            showToast("No preset name entered", Toasts.Type.FAILURE);
        }
    }

    return (
        <div>
            <HeadingSecondary>Create New Preset</HeadingSecondary>
            <Flex style={{ flexDirection: "row", width: "100%", flexBasis: "100%" }}>
                <TextInput
                    inputRef={inputRef}
                    style={{ width: "100%" }}
                    className="settings-textbox"
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            createNewPreset();
                        }
                    }}
                />
                <Button
                    size="small"
                    onClick={() => createNewPreset()}
                >
                    Create Preset
                </Button>
            </Flex>
            <Divider />

            <HeadingSecondary>Existing Presets</HeadingSecondary>
            {
                presetKeys.length > 0 ? (
                    <Flex style={{ flexDirection: "column", gap: "10px" }}>
                        {presetKeys.map(key => {
                            const preset = getPreset(key);
                            const userCount = Object.keys(preset.volumes).length;

                            return (
                                <div key={key} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {/* show either preset name or rename input */}
                                    {renamingPreset === key ? (
                                        <Flex style={{ alignItems: "center", gap: "8px" }}>
                                            <TextInput
                                                inputRef={renameInputRef}
                                                defaultValue={preset.name}
                                                style={{ flex: 1 }}
                                                onKeyDown={e => {
                                                    if (e.key !== "Enter") return;
                                                    if (renameInputRef.current) {
                                                        const newName = renameInputRef.current.value;
                                                        const newKey = createPresetKey(newName);

                                                        if (newKey === "") {
                                                            showToast("Invalid preset name", Toasts.Type.FAILURE);
                                                            return;
                                                        }

                                                        if (newKey !== key && getPresets()[newKey]) {
                                                            showToast("Preset name already in use", Toasts.Type.FAILURE);
                                                            return;
                                                        }

                                                        renamePreset(key, newName);
                                                        setRenamingPreset(null);
                                                    }
                                                }}
                                            />
                                        </Flex>
                                    ) : (
                                        <Paragraph style={{ fontWeight: "bold" }}>
                                            {preset.name} <Span color="text-muted">({userCount} users)</Span>
                                        </Paragraph>
                                    )}

                                    {/* show different buttons depending on normal or rename mode */}
                                    {renamingPreset === key ? (
                                        <Flex style={{ flexDirection: "row", gap: "10px" }}>
                                            <Button
                                                size="small"
                                                variant="secondary"
                                                onClick={() => {
                                                    if (renameInputRef.current) {
                                                        const newName = renameInputRef.current.value;
                                                        const newKey = createPresetKey(newName);

                                                        if (newKey === "") {
                                                            showToast("Invalid preset name", Toasts.Type.FAILURE);
                                                            return;
                                                        }

                                                        if (newKey !== key && getPresets()[newKey]) {
                                                            showToast("Preset name already in use", Toasts.Type.FAILURE);
                                                            return;
                                                        }

                                                        renamePreset(key, newName);
                                                        setRenamingPreset(null);
                                                    }
                                                }}
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="dangerSecondary"
                                                onClick={() => setRenamingPreset(null)}
                                            >
                                                Cancel
                                            </Button>
                                        </Flex>
                                    ) : (
                                        <Flex style={{ flexDirection: "row", gap: "10px" }}>
                                            <Button
                                                size="small"
                                                variant="secondary"
                                                onClick={() => setRenamingPreset(key)}
                                            >
                                                Rename
                                            </Button>

                                            <Button
                                                size="small"
                                                variant="secondary"
                                                onClick={() => togglePreset(key)}
                                            >
                                                {expandedPresets.has(key) ? "Hide Users" : "Show Users"}
                                            </Button>

                                            <Button
                                                variant="dangerSecondary"
                                                size="small"
                                                onClick={() => {
                                                    if (settings.store.currentPreset === key) {
                                                        showToast("Cannot delete active preset!", Toasts.Type.FAILURE);
                                                        return;
                                                    }
                                                    deletePreset(key, setSelectedQuickPreset);
                                                    forceUpdate();
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        </Flex>
                                    )}
                                    {/* User list (only if expanded and there are users) */}
                                    {expandedPresets.has(key) && Object.keys(preset.volumes).length > 0 && (
                                        <Flex style={{ flexDirection: "row", flexWrap: "wrap", gap: "8px" }}>
                                            {Object.keys(preset.volumes).map(userID => {
                                                const user = UserStore.getUser(userID);
                                                const username = user?.username || "Unknown User";
                                                const avatarUrl = user?.getAvatarURL?.(null, 16, true) || "";

                                                return (
                                                    <Flex key={userID} style={{ alignItems: "center", gap: "8px", paddingLeft: "10px" }}>
                                                        <Avatar src={avatarUrl} size="SIZE_16" />
                                                        <Paragraph>{username}</Paragraph>
                                                    </Flex>
                                                );
                                            })}
                                        </Flex>
                                    )}
                                    {expandedPresets.has(key) && Object.keys(preset.volumes).length === 0 && (
                                        <Paragraph>There are currently no users in this preset. Try adding some!</Paragraph>
                                    )}
                                </div>
                            );
                        })}
                    </Flex>
                ) : (
                    <Paragraph>No presets yet. Create one above!</Paragraph>
                )}

            <Divider />

            <HeadingSecondary>Quick Presets</HeadingSecondary>
            {(() => {
                const options = [
                    { label: "No Preset", value: "none" },
                    ...Object.keys(getPresets()).map(key => ({
                        label: getPreset(key).name,
                        value: key
                    }))
                ];

                return (
                    <Grid columns={2} style={{ alignItems: "center", gridTemplateColumns: "max-content 1fr", gap: "8px 12px" }}>
                        {Object.keys(settings.store.quickPresets).map((quickPresetKey, i) => (
                            <>
                                <HeadingTertiary>Alt+{quickPresetKey}:</HeadingTertiary>
                                <SearchableSelect
                                    value={options.find(option => option.value === selectedQuickPreset[quickPresetKey])}
                                    options={options}
                                    onChange={value => {
                                        setSelectedQuickPreset(prev => ({
                                            ...prev,
                                            [quickPresetKey]: value
                                        }));
                                        settings.store.quickPresets[quickPresetKey] = value;
                                    }}
                                />
                            </>
                        ))}
                    </Grid>
                );
            })()}

            <Divider />

            <HeadingSecondary>Active Preset</HeadingSecondary>
            {
                (() => {
                    const options = [
                        { label: "No Active Preset", value: "none" },
                        ...Object.keys(getPresets()).map(key => ({
                            label: getPreset(key).name,
                            value: key
                        }))
                    ];

                    return (
                        <SearchableSelect
                            value={options.find(option => option.value === selected)}
                            options={options}
                            onChange={value => {
                                setSelected(value);
                                settings.store.currentPreset = value;
                            }}
                        />
                    );
                })()}
        </div >
    );
}

function NewPresetModal({ props, userID }: { props: ModalProps, userID: string; }) {
    const inputRef = useRef<HTMLInputElement>(null);

    function createNewPresetAndAddUser() {
        if (inputRef.current != null && inputRef.current.value !== "") {
            const name = inputRef.current.value;
            const presetKey = createPresetKey(inputRef.current.value);

            if (presetKey === "" || presetKey === "none") {
                showToast("Invalid Preset Name", Toasts.Type.FAILURE);
                return;
            }
            if (Object.keys(getPresets()).findIndex(v => v === presetKey) > -1) {
                showToast("Preset name already in use", Toasts.Type.FAILURE);
                return;
            }

            const preset: VolumePreset = { name: name, volumes: {} };
            setPreset(presetKey, preset);
            addUserToPreset(userID, presetKey);
            inputRef.current.value = "";

            showToast(`Preset ${name} has been created (Internal Name of ${presetKey})`);
            props.onClose();
        } else {
            showToast("No preset name entered", Toasts.Type.FAILURE);
        }
    }
    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <HeadingPrimary>Create New Preset To Add User To</HeadingPrimary>
            </ModalHeader>

            <ModalContent>
                <HeadingSecondary style={{ marginTop: "10px" }}>New preset name</HeadingSecondary>
                <TextInput
                    style={{ marginBottom: "10px" }}
                    inputRef={inputRef}
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            createNewPresetAndAddUser();
                        }
                    }}
                />
            </ModalContent>

            <ModalFooter>
                <div className="vc-betterSessions-footer-buttons">
                    <Button
                        variant={"secondary"}
                        onClick={() => props.onClose()}
                    >
                        Cancel
                    </Button>
                    <Button
                        color={"primary"}
                        onClick={createNewPresetAndAddUser}
                    >
                        Save
                    </Button>
                </div>
            </ModalFooter>
        </ModalRoot >
    );
}

const userContextMenuPatch = (children, props) => {
    const group = findGroupChildrenByChildId("user-volume", children);
    group?.push(
        <Menu.MenuItem label="Add to preset" id="add-preset">
            <Menu.MenuItem
                label="All presets"
                id="add-to-all"
                action={() => {
                    Object.keys(getPresets()).map(presetKey => {
                        addUserToPreset(props.user?.id, presetKey);
                        applyPresetToUser(getPreset(presetKey), props.user?.id);
                    });
                }}
            />

            <Menu.MenuItem
                label="New preset..."
                id="add-to-new"
                action={() =>
                    openModal(p => (
                        <NewPresetModal
                            props={p}
                            userID={props.user?.id}
                        />
                    ))
                }
            />

            {Object.keys(getPresets()).map(presetKey => (
                <Menu.MenuItem
                    key={presetKey}
                    id={`add-to-${presetKey}`}
                    label={`Add to "${getPreset(presetKey).name}"`}
                    action={() => {
                        addUserToPreset(props.user?.id, presetKey);
                    }}
                />
            ))}
        </Menu.MenuItem>
    );
    group?.push(
        <Menu.MenuItem
            label="Remove from preset"
            id="remove-preset"
        >
            <Menu.MenuItem
                label="All presets"
                id="remove-from-all"
                action={() => {
                    Object.keys(getPresets()).map(presetKey => (
                        removeUserFromPreset(props.user?.id, presetKey)
                    ));
                }}
            />
            {Object.keys(getPresets()).map(presetKey => (
                <Menu.MenuItem
                    key={presetKey}
                    id={`remove-from-${presetKey}`}
                    label={`Remove from "${getPreset(presetKey).name}"`}
                    action={() => {
                        removeUserFromPreset(props.user?.id, presetKey);
                    }}
                />
            ))}
        </Menu.MenuItem>
    );

    if (props.user?.id === UserStore.getCurrentUser().id) {
        const muteGroup = findGroupChildrenByChildId("mute", children);
        muteGroup?.push(
            <Menu.MenuItem label="Volume Presets" id="apply-volume-preset">
                <Menu.MenuItem
                    id={"guild-apply-none"}
                    label={"Disable Active Preset (Alt+`)"}
                    action={() => {
                        disablePreset();
                    }}
                />
                {Object.keys(getPresets()).map(presetKey => (
                    <Menu.MenuItem
                        key={presetKey}
                        id={`apply-${presetKey}`}
                        label={`${getPreset(presetKey).name}`}
                        action={() => {
                            applyPreset(getPreset(presetKey));
                            settings.store.currentPreset = presetKey;
                        }}
                    />
                ))}
            </Menu.MenuItem>
        );
    }
};

const channelContextMenuPatch = (children, props) => {
    // Only show on voice channels
    if (props.channel?.type !== ChannelType.GUILD_VOICE && props.channel?.type !== ChannelType.GUILD_STAGE_VOICE) return;

    const group = findGroupChildrenByChildId("mute-channel", children);
    group?.push(
        <Menu.MenuItem label="Volume Presets" id="guild-apply-volume-preset">
            <Menu.MenuItem
                id={"guild-apply-none"}
                label={"Disable Active Preset (Alt+`)"}
                action={() => {
                    disablePreset();
                }}
            />
            {Object.keys(getPresets()).map(presetKey => (
                <Menu.MenuItem
                    key={presetKey}
                    id={`guild-apply-${presetKey}`}
                    label={`${getPreset(presetKey).name}`}
                    action={() => {
                        applyPreset(getPreset(presetKey));
                        settings.store.currentPreset = presetKey;
                    }}
                />
            ))}
        </Menu.MenuItem>
    );
};

function voiceCallChangeListener() {
    const myID = UserStore.getCurrentUser().id;
    const channelID = VoiceStateStore.getVoiceStateForUser(myID)?.channelId;
    const { currentPreset } = settings.store;
    if (channelID == null) return;
    if (currentPreset === "none") return;
    const preset = getPresets()[currentPreset];
    const userStates = VoiceStateStore.getVoiceStatesForChannel(channelID);
    const userIDs = Object.keys(userStates);
    userIDs.forEach(id => {
        applyPresetToUser(preset, id);
    });
}

const isAltOrMeta = (e: KeyboardEvent) => e.altKey || (!IS_MAC && e.metaKey);

function keyboardShortcuts(e?: KeyboardEvent, electronInput?: string) {

    if (e) {
        const isZeroToFour = ["`", "1", "2", "3", "4"].includes(e.key);
        if (!isZeroToFour) return;
        if (!isAltOrMeta(e)) return;
        e.preventDefault();
    }
    const key: string = e?.key || electronInput || "";
    if (key === "") {
        return;
    }
    if (key === "`") {
        disablePreset();
        showToast("Disabled Active Preset", Toasts.Type.SUCCESS, { duration: 900 });
        return;
    }
    const presetKey = settings.store.quickPresets[key];
    if (presetKey === "none") {
        disablePreset();
        showToast("Disabled Active Preset", Toasts.Type.SUCCESS, { duration: 900 });
        return;
    }
    const preset = getPreset(presetKey);
    applyPreset(preset);
    showToast(`Applied Quick Preset ${key} (${preset.name})`, Toasts.Type.SUCCESS, { duration: 900 });
}

export default definePlugin({
    name: "VolumePresets",
    description: "Allows the user to automatically set the volumes of other users through the use of customizable volume presets.",
    authors: [{ name: "iken_", id: 366023103626608650n }],
    settings,
    contextMenus: {
        "user-context": userContextMenuPatch,
        "channel-context": channelContextMenuPatch
    },
    async start() {
        await loadPresets();
        VoiceStateStore.addChangeListener(voiceCallChangeListener);
        window.addEventListener("keydown", keyboardShortcuts);
    },
    async stop() {
        await savePresets();
        VoiceStateStore.removeChangeListener(voiceCallChangeListener);
        window.removeEventListener("keydown", keyboardShortcuts);
        appliedUsers.clear();
    }
});

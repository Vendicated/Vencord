/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isNonNullish } from "@utils/guards";
import { classes } from "@utils/misc";
import { ProfilePreset } from "@vencord/discord-types";
import { ContextMenuApi, Menu, React, TextInput } from "@webpack/common";

import { cl } from "..";
import { deletePreset, movePreset, renamePreset, updatePresetField } from "../utils/actions";
import { getCurrentProfile } from "../utils/profile";
import { PresetSection, type ProfilePresetEx } from "../utils/storage";

interface PresetListProps {
    presets: ProfilePresetEx[];
    allPresets: ProfilePresetEx[];
    avatarSize: number;
    selectedPreset: number;
    onLoad: (index: number) => void;
    onUpdate: () => void;
    guildId?: string;
    section: PresetSection;
    currentPage: number;
    onPageChange: (page: number) => void;
}

export function PresetList({
    presets,
    allPresets,
    avatarSize,
    selectedPreset,
    onLoad,
    onUpdate,
    guildId,
    section,
    currentPage,
    onPageChange
}: PresetListProps) {
    type EditableProfile = Omit<ProfilePreset, "name" | "timestamp">;
    const [renaming, setRenaming] = React.useState<number>(-1);
    const [renameText, setRenameText] = React.useState("");
    const isGuildProfile = section === "server";

    return (
        <div className={cl("list-container")}>
            {presets.map(preset => {
                const actualIndex = allPresets.indexOf(preset);
                const isRenaming = renaming === actualIndex;
                const isSelected = !isRenaming && selectedPreset === actualIndex;
                const date = new Date(preset.timestamp);
                const formattedDate = date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                });
                const formattedTime = date.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit"
                });

                const commitRename = () => {
                    const nextName = renameText.trim();
                    if (!nextName) return;
                    renamePreset(actualIndex, nextName, section, guildId);
                    onUpdate();
                };

                return (
                    <div
                        key={actualIndex}
                        tabIndex={isRenaming ? -1 : 0}
                        role="button"
                        onClick={() => {
                            if (!isRenaming) {
                                onLoad(actualIndex);
                            }
                        }}
                        onKeyDown={e => {
                            if (!isRenaming && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                onLoad(actualIndex);
                            }
                        }}
                        className={classes(cl("row"), isSelected ? "selected" : "")}
                    >
                        <div className={cl("avatar-url")}>
                            {preset.avatarDataUrl && (
                                <img
                                    src={preset.avatarDataUrl}
                                    alt=""
                                    className={cl("avatar")}
                                    style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
                                />
                            )}
                            <div className={cl("rename")}>
                                {isRenaming ? (
                                    <TextInput
                                        value={renameText}
                                        onChange={setRenameText}
                                        onBlur={() => {
                                            commitRename();
                                            setRenaming(-1);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === "Enter") {
                                                commitRename();
                                                setRenaming(-1);
                                            } else if (e.key === "Escape") {
                                                setRenaming(-1);
                                            }
                                            e.stopPropagation();
                                        }}
                                        onClick={e => e.stopPropagation()}
                                        autoFocus
                                    />
                                ) : (
                                    <>
                                        <div className={cl("name")}>
                                            {preset.name}
                                        </div>
                                        <div className={cl("timestamp")}>
                                            {formattedDate} at {formattedTime}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className={cl("updated")}>
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                className={cl("menu-icon")}
                                onClick={e => {
                                    e.stopPropagation();
                                    const target = e.currentTarget;
                                    ContextMenuApi.openContextMenu(e, () => (
                                        <Menu.Menu navId="preset-options" onClose={ContextMenuApi.closeContextMenu}>
                                            <Menu.MenuItem
                                                id="rename"
                                                label="Rename"
                                                action={() => {
                                                    setRenaming(actualIndex);
                                                    setRenameText(preset.name);
                                                }}
                                            />
                                            <Menu.MenuItem
                                                id="update"
                                                label="Update"
                                                action={async () => {
                                                    const profile = await getCurrentProfile(guildId, { isGuildProfile });
                                                    await Promise.all(
                                                        (Object.entries(profile) as [keyof EditableProfile, EditableProfile[keyof EditableProfile]][])
                                                            .filter(([, value]) => isNonNullish(value))
                                                            .map(([key, value]) => updatePresetField(actualIndex, key, value, section, guildId))
                                                    );
                                                    onUpdate();
                                                }}
                                            />
                                            <Menu.MenuSeparator />
                                            {actualIndex > 0 && (
                                                <Menu.MenuItem
                                                    id="move-up"
                                                    label="Move Up"
                                                    action={() => {
                                                        movePreset(actualIndex, actualIndex - 1, section, guildId);
                                                        onUpdate();
                                                    }}
                                                />
                                            )}
                                            {actualIndex < allPresets.length - 1 && (
                                                <Menu.MenuItem
                                                    id="move-down"
                                                    label="Move Down"
                                                    action={() => {
                                                        movePreset(actualIndex, actualIndex + 1, section, guildId);
                                                        onUpdate();
                                                    }}
                                                />
                                            )}
                                            {currentPage > 1 && (
                                                <Menu.MenuItem
                                                    id="move-to-page-1"
                                                    label="Move to Page 1"
                                                    action={() => {
                                                        movePreset(actualIndex, 0, section, guildId);
                                                        onPageChange(1);
                                                        onUpdate();
                                                    }}
                                                />
                                            )}
                                            <Menu.MenuSeparator />
                                            <Menu.MenuItem
                                                id="delete"
                                                label="Delete"
                                                color="danger"
                                                action={async () => {
                                                    await deletePreset(actualIndex, section, guildId);
                                                    onUpdate();
                                                }}
                                            />
                                        </Menu.Menu>
                                    ));
                                }}
                            >
                                <path
                                    fill="currentColor"
                                    d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"
                                />
                            </svg>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

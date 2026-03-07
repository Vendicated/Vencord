/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { classes } from "@utils/misc";
import { openModal } from "@utils/modal";
import { React, SelectedGuildStore, TextInput, useStateFromStores } from "@webpack/common";

import { cl, settings } from "../index";
import { exportPresets, ImportDecision, importPresets, savePreset } from "../utils/actions";
import { loadPresetAsPending } from "../utils/profile";
import { loadPresets, presets, PresetSection, setCurrentPresetIndex } from "../utils/storage";
import { ImportProfilesModal } from "./confirmModal";
import { PresetList } from "./presetList";

const PRESETS_PER_PAGE = 5;

type PresetManagerProps = {
    section?: PresetSection;
    guildId?: string;
};

export function PresetManager({ section, guildId }: PresetManagerProps) {
    const [presetName, setPresetName] = React.useState("");
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    const [isSaving, setIsSaving] = React.useState(false);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageInput, setPageInput] = React.useState("1");
    const [selectedPreset, setSelectedPreset] = React.useState<number>(-1);
    const [searchMode, setSearchMode] = React.useState(false);
    const lastRandomIndexRef = React.useRef<number>(-1);
    const resolvedSection: PresetSection = section ?? "main";
    const isServerSection = resolvedSection === "server";
    const lastSelectedGuildId = useStateFromStores(
        [SelectedGuildStore],
        () => SelectedGuildStore.getLastSelectedGuildId() ?? SelectedGuildStore.getGuildId()
    );
    const resolvedGuildId = isServerSection ? (guildId ?? lastSelectedGuildId ?? undefined) : undefined;
    const canUseGuild = !isServerSection || Boolean(resolvedGuildId);

    React.useEffect(() => {
        let isActive = true;
        (async () => {
            await loadPresets(resolvedSection);
            if (!isActive) return;
            setSelectedPreset(-1);
            setCurrentPage(1);
            setPageInput("1");
            forceUpdate();
        })();
        return () => {
            isActive = false;
        };
    }, [resolvedGuildId, resolvedSection]);

    const filteredPresets = !searchMode
        ? presets
        : presets.filter(preset => preset.name.toLowerCase().includes(presetName.toLowerCase()));

    const totalPages = Math.ceil(filteredPresets.length / PRESETS_PER_PAGE);
    const startIndex = (currentPage - 1) * PRESETS_PER_PAGE;
    const currentPresets = filteredPresets.slice(startIndex, startIndex + PRESETS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            setPageInput(String(newPage));
        }
    };

    const handleSavePreset = async () => {
        if (!canUseGuild) return;
        const trimmedName = presetName.trim();
        if (!trimmedName) return;
        setIsSaving(true);
        await savePreset(trimmedName, resolvedSection, resolvedGuildId);
        setPresetName("");
        setIsSaving(false);
        const newTotalPages = Math.ceil(presets.length / PRESETS_PER_PAGE);
        handlePageChange(newTotalPages);
        forceUpdate();
    };

    const applyPreset = (index: number) => {
        setSelectedPreset(index);
        setCurrentPresetIndex(index);
        loadPresetAsPending(presets[index], resolvedGuildId, {
            isGuildProfile: resolvedSection === "server"
        });
        forceUpdate();
    };

    const handleLoadPreset = (index: number) => {
        if (!canUseGuild) return;
        applyPreset(index);
    };

    const selectRandomPreset = (sectionType: PresetSection) => {
        const availablePresets = presets;
        if (!availablePresets.length) return null;
        const randomIndex = Math.floor(Math.random() * availablePresets.length);
        return { preset: availablePresets[randomIndex], index: randomIndex, section: sectionType };
    };

    const handleRandomPreset = () => {
        if (!canUseGuild) return;
        const selection = selectRandomPreset(resolvedSection);
        if (!selection) return;
        let nextIndex = selection.index;
        if (presets.length > 1 && nextIndex === lastRandomIndexRef.current) {
            let attempts = 0;
            while (attempts < 5 && nextIndex === lastRandomIndexRef.current) {
                nextIndex = Math.floor(Math.random() * presets.length);
                attempts++;
            }
        }
        lastRandomIndexRef.current = nextIndex;
        applyPreset(nextIndex);
    };

    const showImportPrompt = (existingCount: number): Promise<ImportDecision> => {
        return new Promise(resolve => {
            openModal(props => (
                <ImportProfilesModal
                    {...props}
                    title="Import Profiles"
                    message={`You have ${existingCount} existing profiles in this section. Do you want to override them or merge with imported profiles?`}
                    onOverride={() => resolve("override")}
                    onMerge={() => resolve("merge")}
                    onCancel={() => resolve("cancel")}
                />
            ));
        });
    };

    const { avatarSize } = settings.store;
    const hasPresets = presets.length > 0;
    const shouldShowPagination = filteredPresets.length > PRESETS_PER_PAGE;

    return (
        <div className={classes(cl("section"), isServerSection ? cl("section-server") : "")} >
            <Heading tag="h3" className={cl("heading")}>
                Saved Profiles
            </Heading>

            <div className={cl("text")}>
                <TextInput
                    placeholder={searchMode ? "Search profiles..." : "Profile Name"}
                    value={presetName}
                    onChange={setPresetName}
                    className={cl("text-input")}
                />
            </div>

            <div className={cl("search")}>
                {!searchMode && (
                    <Button
                        size="small"
                        disabled={isSaving || !presetName.trim() || !canUseGuild}
                        onClick={handleSavePreset}
                        className={cl("search-button")}
                    >
                        {isSaving ? "Saving..." : "Save Profile"}
                    </Button>
                )}
                {hasPresets && (
                    <Button
                        size="small"
                        variant={searchMode ? "primary" : "secondary"}
                        onClick={() => {
                            setSearchMode(!searchMode);
                            handlePageChange(1);
                        }}
                    >
                        {searchMode ? "Cancel Search" : "Search"}
                    </Button>
                )}
            </div>

            {hasPresets && (
                <>
                    <PresetList
                        presets={currentPresets}
                        allPresets={presets}
                        avatarSize={avatarSize}
                        selectedPreset={selectedPreset}
                        onLoad={handleLoadPreset}
                        onUpdate={() => {
                            const newTotal = Math.ceil(presets.length / PRESETS_PER_PAGE);
                            if (newTotal === 0) {
                                handlePageChange(1);
                            } else if (currentPage > newTotal) {
                                handlePageChange(newTotal);
                            }
                            forceUpdate();
                        }}
                        guildId={resolvedGuildId}
                        section={resolvedSection}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                    />

                    {shouldShowPagination && (
                        <div className={cl("pagination")}>
                            <Button
                                size="small"
                                variant="secondary"
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                            >
                                ←
                            </Button>
                            <div className={cl("page")}>
                                <input
                                    type="text"
                                    value={pageInput}
                                    onChange={e => {
                                        const { value } = e.target;
                                        setPageInput(value);
                                        const num = parseInt(value);
                                        if (!isNaN(num) && num >= 1 && num <= totalPages) {
                                            setCurrentPage(num);
                                        }
                                    }}
                                    className={cl("page-input")}
                                />
                                <span className={cl("page-of")}>
                                    / {totalPages}
                                </span>
                            </div>
                            <Button
                                size="small"
                                variant="secondary"
                                disabled={currentPage === totalPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                            >
                                →
                            </Button>
                        </div>
                    )}

                    <hr className={cl("block")} />
                </>
            )}

            <div className={cl("import")}>
                <Button
                    size="small"
                    variant="secondary"
                    onClick={handleRandomPreset}
                    className={cl("random")}
                    disabled={!presets.length || !canUseGuild}
                >
                    <span className={cl("random-content")}>
                        <svg className={cl("random-icon")} viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                fill="currentColor"
                                d="M20.5 4h-5a1 1 0 0 0 0 2h2.586l-4.293 4.293a1 1 0 0 0 1.414 1.414L19.5 7.414V10a1 1 0 1 0 2 0V5a1 1 0 0 0-1-1Zm-16 1a1 1 0 0 0 0 2h2.586l4.293 4.293a1 1 0 1 0 1.414-1.414L8.414 5H4.5ZM5 15a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0v-2.586l4.293 4.293a1 1 0 0 0 1.414-1.414L7.414 17H10a1 1 0 1 0 0-2H5Zm14.5 0a1 1 0 0 0 0 2h-2.586l-4.293 4.293a1 1 0 1 0 1.414 1.414L18.586 17H21a1 1 0 1 0 0-2h-1.5Z"
                            />
                        </svg>
                        Random
                    </span>
                </Button>
                <Button
                    size="small"
                    variant="secondary"
                    onClick={() => importPresets(forceUpdate, showImportPrompt, resolvedSection, resolvedGuildId)}
                    disabled={!canUseGuild}
                >
                    Import
                </Button>
                <Button
                    size="small"
                    variant="secondary"
                    onClick={() => exportPresets(resolvedSection)}
                >
                    Export All
                </Button>
            </div>
            <hr className={cl("block")} />
            {resolvedSection === "server" && (
                <hr className={cl("block")} />
            )}
        </div>
    );
}

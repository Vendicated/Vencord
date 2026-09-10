/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import { CogWheel, PencilIcon } from "@components/Icons";
import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalRoot,
    ModalSize,
    openModal
} from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import {
    Button,
    Forms,
    GuildStore,
    Parser,
    React,
    ScrollerAuto,
    TextArea,
    TextInput,
    Tooltip,
    useEffect,
    useMemo,
    useState
} from "@webpack/common";
import type { Guild } from "discord-types/general";

import { getNoteForServer, NoteData, saveNoteForServer } from "./settingsUtils";

const cl = classNameFactory("vc-snotes-");
const EditIcon = PencilIcon;

const MarkupClasses = findByPropsLazy("markup");
const MarkDownClasses = findByPropsLazy("markdown");
const MarkDown_Classes = findByPropsLazy("markdown");
const IconUtils = findByPropsLazy("getGuildIconURL");

const ConfirmationModalModule = findByPropsLazy("openModalLazy", "openConfirmationModal");

interface TagComponentProps {
    tag: string;
    onRemove?: (tag: string) => void;
    readOnly?: boolean;
    className?: string;
}
const TagComponent: React.FC<TagComponentProps> = ({ tag, onRemove, readOnly, className }) => (
    <div className={cl("tag-item", readOnly ? "readonly" : "", className)}>
        <CogWheel className={cl("tag-item-icon")} />
        <span className={cl("tag-item-text")}>{tag}</span>
        {!readOnly && onRemove && (
            <button
                type="button"
                className={cl("tag-item-remove")}
                onClick={() => onRemove(tag)}
                aria-label={`Remove tag ${tag}`}
            >
            </button>
        )}
    </div>
);

interface ServerNotesModalProps {
    guild: Guild;
    modalProps: {
        transitionState: number;
        onClose: () => void;
    };
}

const ServerNotesModalComponent: React.FC<ServerNotesModalProps> = ({ guild, modalProps }) => {
    const [currentNoteData, setCurrentNoteData] = useState<NoteData>({ text: "", tags: [] });
    const [currentTextForEdit, setCurrentTextForEdit] = useState<string>("");
    const [currentTagsForEdit, setCurrentTagsForEdit] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState<string>("");
    const [originalNoteDataForEdit, setOriginalNoteDataForEdit] = useState<NoteData>({ text: "", tags: [] });

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [guildName, setGuildName] = useState<string>(guild.name);

    let guildIconDisplay: React.ReactNode = null;
    const currentGuildForIcon = GuildStore.getGuild(guild.id) || guild;

    if (IconUtils && typeof IconUtils.getGuildIconURL === "function" && currentGuildForIcon?.id && currentGuildForIcon?.icon) {
        const iconUrl = IconUtils.getGuildIconURL({
            id: currentGuildForIcon.id,
            icon: currentGuildForIcon.icon,
            size: 28,
            canAnimate: true
        });
        if (iconUrl) {
            guildIconDisplay = <img src={iconUrl} alt={`${currentGuildForIcon.name} Icon`} className={cl("guild-icon")} />;
        }
    }
    if (!guildIconDisplay && currentGuildForIcon?.id && currentGuildForIcon?.icon) {
        const iconUrl = `https://cdn.discordapp.com/icons/${currentGuildForIcon.id}/${currentGuildForIcon.icon}.${currentGuildForIcon.icon.startsWith("a_") ? "gif" : "png"}?size=32`;
        guildIconDisplay = <img src={iconUrl} alt={`${currentGuildForIcon.name} Icon`} className={cl("guild-icon")} />;
    }
    if (!guildIconDisplay) {
        const initials = currentGuildForIcon?.name?.split(" ").map(word => word[0]).join("").substring(0, 3).toUpperCase() || "?";
        guildIconDisplay = <div className={cl("guild-icon", "placeholder")}>{initials}</div>;
    }

    useEffect(() => {
        setIsLoading(true);
        const noteData = getNoteForServer(guild.id);
        setCurrentNoteData(noteData);
        setCurrentTextForEdit(noteData.text);
        setCurrentTagsForEdit([...noteData.tags]);
        setOriginalNoteDataForEdit(JSON.parse(JSON.stringify(noteData)));
        setIsLoading(false);
        setGuildName(GuildStore.getGuild(guild.id)?.name || guild.name);
    }, [guild.id, guild.name]);

    const hasUnsavedChanges = useMemo(() => {
        if (!isEditing) return false;
        const originalTagsString = [...originalNoteDataForEdit.tags].sort().join(",");
        const currentTagsString = [...currentTagsForEdit].sort().join(",");
        return originalNoteDataForEdit.text !== currentTextForEdit || originalTagsString !== currentTagsString;
    }, [isEditing, currentTextForEdit, currentTagsForEdit, originalNoteDataForEdit]);

    const handleEditClick = () => {
        setCurrentTextForEdit(currentNoteData.text);
        setCurrentTagsForEdit([...currentNoteData.tags]);
        setOriginalNoteDataForEdit(JSON.parse(JSON.stringify(currentNoteData)));
        setIsEditing(true);
    };

    const handleSaveClick = () => {
        const cleanedTags = currentTagsForEdit.map(t => t.trim()).filter(t => t !== "");
        saveNoteForServer(guild.id, currentTextForEdit, cleanedTags);
        setCurrentNoteData({ text: currentTextForEdit, tags: cleanedTags });
        setIsEditing(false);
    };

    const attemptClose = () => {
        if (isEditing && hasUnsavedChanges) {
            if (ConfirmationModalModule && typeof ConfirmationModalModule.openConfirmationModal === "function") {
                ConfirmationModalModule.openConfirmationModal({
                    title: "Unsaved Changes",
                    content: "You have unsaved changes. Are you sure you want to discard them and close the modal?",
                    confirmText: "Discard & Close",
                    cancelText: "Keep Editing",
                    danger: true,
                    onConfirm: modalProps.onClose,
                });
            } else {
                if (window.confirm("You have unsaved changes. Are you sure you want to discard them and close?")) {
                    modalProps.onClose();
                }
            }
        } else {
            modalProps.onClose();
        }
    };

    const handleCancelClick = () => {
        if (hasUnsavedChanges) {
            if (ConfirmationModalModule && typeof ConfirmationModalModule.openConfirmationModal === "function") {
                ConfirmationModalModule.openConfirmationModal({
                    title: "Discard Changes?",
                    content: "Are you sure you want to discard your changes to this note?",
                    confirmText: "Discard",
                    cancelText: "Keep Editing",
                    danger: true,
                    onConfirm: () => {
                        setCurrentTextForEdit(currentNoteData.text);
                        setCurrentTagsForEdit([...currentNoteData.tags]);
                        setIsEditing(false);
                    },
                });
            } else {
                if (window.confirm("Are you sure you want to discard your changes?")) {
                    setCurrentTextForEdit(currentNoteData.text);
                    setCurrentTagsForEdit([...currentNoteData.tags]);
                    setIsEditing(false);
                }
            }
        } else {
            setIsEditing(false);
        }
    };

    const handleAddTag = () => {
        const newTag = tagInput.trim().toLowerCase();
        if (newTag && !currentTagsForEdit.map(t => t.toLowerCase()).includes(newTag) && currentTagsForEdit.length < 10) {
            setCurrentTagsForEdit([...currentTagsForEdit, newTag]);
        }
        setTagInput("");
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setCurrentTagsForEdit(currentTagsForEdit.filter(tag => tag !== tagToRemove));
    };

    const discordMessageStyleClasses = [
        MarkupClasses?.markup,
        MarkDownClasses?.markdown,
        (MarkDown_Classes as any)?.markdown_5f,
    ].filter(Boolean).join(" ");

    const renderNoteContentViewMode = (noteDataToRender: NoteData, inGuildId: string) => {
        if (isLoading) {
            return <div className={cl("rendered-note-area", "empty", MarkupClasses?.markup, MarkDownClasses?.markdown, MarkDown_Classes?.markdown_5f)}>Loading note...</div>;
        }
        const { text: noteText, tags: noteTags } = noteDataToRender;
        if (!noteText.trim() && noteTags.length === 0) {
            return <div className={cl("rendered-note-area", "empty", MarkupClasses?.markup, MarkDownClasses?.markdown, MarkDown_Classes?.markdown_5f)}>No note or tags yet. Click the edit icon to add some!</div>;
        }

        let parsedTextContent: React.ReactNode = null;
        if (noteText.trim()) {
            try {
                const isStateInline = false;

                const parseOptions = {
                    channelId: "",
                    guildId: inGuildId,
                    mentioned: true,
                    renderSpoilers: true,
                    allowLinks: true,
                    allowHeading: true,
                    allowList: true,
                    allowEmojiLinks: true,
                };
                parsedTextContent = Parser.parse(noteText, isStateInline, parseOptions);
            } catch (e) {
                console.error("ServerNotes: Error parsing note text:", e);
                parsedTextContent = <div className={cl("parse-error-text")}>Error displaying note content.</div>;
            }
        }

        return (
            <ScrollerAuto className={`${cl("rendered-note-area")} ${discordMessageStyleClasses}`}>
                {noteTags.length > 0 && (
                    <div className={cl("tags-view-area")}>
                        {noteTags.map(tag => <TagComponent key={tag} tag={tag} readOnly className={cl("view-mode-tag")} />)}
                    </div>
                )}
                {parsedTextContent || (noteTags.length > 0 ? null : <div className={cl("empty-text-placeholder")}>No text content.</div>)}
            </ScrollerAuto>
        );
    };

    const noteContentToDisplay = useMemo(() => {
        if (isEditing) return null;
        return renderNoteContentViewMode(currentNoteData, guild.id);
    }, [currentNoteData, guild.id, isEditing, isLoading]);

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE} className={cl("modal-root")}>
            <ModalHeader className={cl("modal-header")}>
                <div className={cl("header-info-wrapper")}>
                    {guildIconDisplay}
                    <Forms.FormTitle tag="h1" className={cl("title")}>
                        Note for {guildName}
                    </Forms.FormTitle>
                </div>
                <div className={cl("header-actions-wrapper")}>
                    {!isEditing && (
                        <Tooltip text="Edit Note">
                            {props => (
                                <Button
                                    {...props}
                                    size={Button.Sizes.NONE}
                                    look={Button.Looks.BLANK}
                                    onClick={handleEditClick}
                                    className={cl("edit-button")}
                                    innerClassName={cl("edit-button-inner")}
                                >
                                    <EditIcon />
                                </Button>
                            )}
                        </Tooltip>
                    )}
                    <ModalCloseButton onClick={attemptClose} className={cl("modal-close-button")} />
                </div>
            </ModalHeader>

            <ModalContent className={cl("modal-content", isEditing ? "editing" : "viewing")}>
                {isEditing ? (
                    <div className={cl("edit-container")}>
                        <TextArea
                            className={cl("textarea")}
                            value={currentTextForEdit}
                            onChange={setCurrentTextForEdit}
                            autoFocus
                            rows={8}
                        />
                        <Forms.FormSection title="Tags" className={cl("tags-edit-section")}>
                            <div className={cl("tag-input-area")}>
                                <TextInput
                                    value={tagInput}
                                    onChange={setTagInput}
                                    placeholder="Add a tag (e.g., important, todo)"
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                        if (e.key === "Enter" || e.key === ",") {
                                            e.preventDefault();
                                            handleAddTag();
                                        }
                                    }}
                                    className={cl("tag-input")}
                                    aria-label="New tag input"
                                />
                                <Button onClick={handleAddTag} size={Button.Sizes.SMALL} className={cl("tag-add-button")} disabled={!tagInput.trim()}>Add Tag</Button>
                            </div>
                            <ScrollerAuto className={cl("tags-list-scroller")}>
                                <div className={cl("tags-list-editable")}>
                                    {currentTagsForEdit.length === 0 && <span className={cl("no-tags-text")}>No tags yet.</span>}
                                    {currentTagsForEdit.map(tag => (
                                        <TagComponent key={tag} tag={tag} onRemove={handleRemoveTag} />
                                    ))}
                                </div>
                            </ScrollerAuto>
                        </Forms.FormSection>
                    </div>
                ) : (
                    noteContentToDisplay
                )}
            </ModalContent>

            <ModalFooter className={cl("modal-footer")}>
                {isEditing ? (
                    <>
                        <Button onClick={handleCancelClick} color={Button.Colors.RED} className={cl("cancel-button")}>Cancel</Button>
                        <Button onClick={handleSaveClick} className={cl("save-button")} disabled={!hasUnsavedChanges}>Save</Button>
                    </>
                ) : (
                    <div style={{ minHeight: "40px" }} />
                )}
            </ModalFooter>
        </ModalRoot>
    );
};

export function openServerNotesModal(guild: Guild) {
    openModal(props => <ServerNotesModalComponent guild={guild} modalProps={props} />, {
        modalKey: `server-notes-modal-${guild.id}`
    });
}

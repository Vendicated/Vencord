/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./allNotesViewerStyles.css";

import { classNameFactory } from "@api/Styles";
import { Logger as LoggerClass } from "@utils/Logger";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import {
    Button,
    Forms,
    GuildChannelStore,
    GuildStore,
    NavigationRouter,
    Parser,
    React,
    ScrollerAuto,
    TextInput,
    useEffect,
    useMemo,
    useState
} from "@webpack/common";
import type { Guild } from "discord-types/general";

import { openServerNotesModal } from "./serverNotesModal";
import { getAllNotes, getAllUniqueTags, NoteData } from "./settingsUtils";

const cl = classNameFactory("vc-all-notes-");
const logger = new LoggerClass("ServerNotes");

const MarkupClasses = findByPropsLazy("markup");
const MarkDownClasses = findByPropsLazy("markdown");
const MarkDown_Classes = findByPropsLazy("markdown");
const IconUtils = findByPropsLazy("getGuildIconURL");

interface TagPillProps {
    tag: string;
    isFilterPill?: boolean;
    onClick?: () => void;
    isSelected?: boolean;
    className?: string;
}
const TagPill: React.FC<TagPillProps> = ({ tag, isFilterPill, onClick, isSelected, className }) => (
    <div
        className={cl(
            "tag-pill",
            isFilterPill ? "filter" : "display",
            isSelected ? "selected" : "",
            className
        )}
        onClick={onClick}
        role={isFilterPill ? "button" : undefined}
        tabIndex={isFilterPill ? 0 : undefined}
        onKeyDown={isFilterPill && onClick ? (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
        aria-pressed={isFilterPill ? isSelected : undefined}
    >
        {tag}
    </div>
);

interface AllNotesViewerModalProps {
    modalProps: {
        transitionState: number;
        onClose: () => void;
    };
}

interface EnrichedNoteWithTags extends NoteData {
    guildId: string;
    guild: Guild;
}

export const AllNotesViewerModalComponent: React.FC<AllNotesViewerModalProps> = ({ modalProps }) => {
    const [allNotesData, setAllNotesData] = useState<Record<string, NoteData>>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [uniqueTags, setUniqueTags] = useState<string[]>([]);
    const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        setAllNotesData(getAllNotes());
        setUniqueTags(getAllUniqueTags());
        setIsLoading(false);
    }, []);

    const enrichedNotes: EnrichedNoteWithTags[] = useMemo(() => {
        return Object.entries(allNotesData)
            .map(([guildId, noteData]) => ({
                ...noteData,
                guildId,
                guild: GuildStore.getGuild(guildId),
            }))
            .filter(enrichedNote => !!enrichedNote.guild) as EnrichedNoteWithTags[];
    }, [allNotesData]);

    const filteredNotes = useMemo(() => {
        if (isLoading) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();

        return enrichedNotes.filter(
            ({ text, tags, guild }) =>
                (lowerSearchTerm === "" ||
                    text.toLowerCase().includes(lowerSearchTerm) ||
                    guild.name.toLowerCase().includes(lowerSearchTerm) ||
                    tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))) &&
                (selectedFilterTags.length === 0 || selectedFilterTags.every(filterTag => tags.map(t => t.toLowerCase()).includes(filterTag.toLowerCase())))
        );
    }, [searchTerm, enrichedNotes, selectedFilterTags, isLoading]);

    const toggleFilterTag = (tagToToggle: string) => {
        const lowerTagToToggle = tagToToggle.toLowerCase();
        setSelectedFilterTags(prev =>
            prev.map(t => t.toLowerCase()).includes(lowerTagToToggle)
                ? prev.filter(t => t.toLowerCase() !== lowerTagToToggle)
                : [...prev, tagToToggle]
        );
    };

    const discordMessageStyleClasses = [
        MarkupClasses?.markup,
        MarkDownClasses?.markdown,
        (MarkDown_Classes as any)?.markdown_5f,
    ].filter(Boolean).join(" ");

    const ParsedNoteSnippet: React.FC<{ noteText: string; guildId: string; }> = ({ noteText, guildId }) => {
        if (!noteText) return <div className={cl("list-item-note-snippet", "empty-text")}>(No text content)</div>;
        const snippet = noteText.length > 200 ? noteText.substring(0, 200) + "..." : noteText;
        let parsedTextContent: React.ReactNode = null;
        try {
            const isStateInline = false;

            const parseOptions = {
                channelId: "",
                mentioned: true,
                renderSpoilers: true,
                allowLinks: true,
                allowHeading: true,
                allowList: true,
                allowEmojiLinks: true,
            };
            parsedTextContent = Parser.parse(noteText, isStateInline, parseOptions);
            const parsedContent = Parser.parse(snippet, true, { channelId: "", guildId, mentioned: true });
            return <div className={`${cl("list-item-note-snippet")} ${discordMessageStyleClasses}`}>{parsedContent}</div>;
        } catch (e) {
            logger.error("Error parsing note snippet in AllNotesViewerModal", e);
            return <p className={cl("list-item-note-snippet", "parse-error")}>{snippet}</p>;
        }
    };

    const handleGoToGuild = (guildId: string) => {
        const defaultChannel = GuildChannelStore.getDefaultChannel(guildId);
        const defaultChannelId = defaultChannel?.id;
        if (NavigationRouter && typeof NavigationRouter.transitionToGuild === "function") {
            NavigationRouter.transitionToGuild(guildId, defaultChannelId);
        } else {
            logger.error("NavigationRouter.transitionToGuild not found or is not a function.");
        }
        modalProps.onClose();
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE} className={cl("modal-root")}>
            <ModalHeader className={cl("modal-header")}>
                <h1 className={cl("title")}>All Server Notes</h1>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <div className={cl("filter-controls-area")}>
                <TextInput
                    placeholder="Search notes, server names, or tags..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                    className={cl("filter-input")}
                    aria-label="Search all notes"
                    autoFocus
                />
                {uniqueTags.length > 0 && (
                    <Forms.FormSection title="Filter by Tags" className={cl("tag-filter-section")}>
                        <ScrollerAuto fade={true} className={cl("tag-filter-scroller")}>
                            <div className={cl("tag-filter-list")}>
                                {uniqueTags.map(tag => (
                                    <TagPill
                                        key={tag}
                                        tag={tag}
                                        isFilterPill
                                        onClick={() => toggleFilterTag(tag)}
                                        isSelected={selectedFilterTags.map(t => t.toLowerCase()).includes(tag.toLowerCase())}
                                        className={cl("filter-tag-pill")}
                                    />
                                ))}
                            </div>
                        </ScrollerAuto>
                    </Forms.FormSection>
                )}
            </div>

            <ModalContent className={cl("modal-content")}>
                {isLoading ? (
                    <div className={cl("loading-state")}>Loading notes...</div>
                ) : filteredNotes.length === 0 ? (
                    <div className={cl("empty-state")}>
                        <p>{searchTerm || selectedFilterTags.length > 0 ? "No notes match your current filters." : "You haven't written any server notes yet!"}</p>
                    </div>
                ) : (
                    <ScrollerAuto fade={true} className={cl("list-scroller")}>
                        <div className={cl("list-container")}>
                            {filteredNotes.map(note => {
                                let guildIconDisplay: React.ReactNode = null;
                                const { guild, guildId, text: noteText, tags } = note;

                                if (IconUtils && typeof IconUtils.getGuildIconURL === "function" && guild?.id && guild?.icon) {
                                    const iconUrl = IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 32, canAnimate: true });
                                    if (iconUrl) {
                                        guildIconDisplay = <img src={iconUrl} alt={`${guild.name} Icon`} className={cl("list-item-guild-icon")} />;
                                    }
                                }
                                if (!guildIconDisplay && guild?.id && guild?.icon) {
                                    const iconUrl = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith("a_") ? "gif" : "png"}?size=32`;
                                    guildIconDisplay = <img src={iconUrl} alt={`${guild.name} Icon`} className={cl("list-item-guild-icon")} />;
                                }
                                if (!guildIconDisplay) {
                                    const initials = guild?.name?.split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase() || "?";
                                    guildIconDisplay = <div className={cl("list-item-guild-icon", "placeholder")}>{initials}</div>;
                                }

                                return (
                                    <div key={guildId} className={cl("list-item")}>
                                        <div className={cl("list-item-header")}>
                                            {guildIconDisplay}
                                            <span className={cl("list-item-guild-name")}>{guild?.name || "Unknown Server"}</span>
                                        </div>
                                        {tags.length > 0 && (
                                            <div className={cl("list-item-tags-display")}>
                                                {tags.map(tag => <TagPill key={tag} tag={tag} className={cl("display-tag-pill")} />)}
                                            </div>
                                        )}
                                        <ParsedNoteSnippet noteText={noteText} guildId={guildId} />
                                        <div className={cl("list-item-actions")}>
                                            <Button size={Button.Sizes.SMALL} onClick={() => guild && openServerNotesModal(guild)} className={cl("action-button")}>Edit</Button>
                                            <Button size={Button.Sizes.SMALL} color={Button.Colors.GREEN} onClick={() => handleGoToGuild(guildId)} className={cl("action-button", "go-to-server")}>Go to Server</Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollerAuto>
                )}
            </ModalContent>
        </ModalRoot>
    );
};

export function openAllNotesViewerModal() {
    openModal(props => <AllNotesViewerModalComponent modalProps={props} />, {
        modalKey: "all-server-notes-viewer-modal"
    });
}

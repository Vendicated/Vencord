/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, TextButton } from "@components/Button";
import {
    getPins,
    getStorageError,
    getStorageState,
    makePinKey,
    type StoredPin,
    subscribe,
} from "@plugins/contextPins/storage";
import { copyWithToast } from "@utils/discord";
import type { RenderModalProps } from "@vencord/discord-types";
import {
    ChannelStore,
    Forms,
    MessageActions,
    MessageStore,
    PermissionsBits,
    PermissionStore,
    ScrollerThin,
    SearchableSelect,
    Select,
    Text,
    TextInput,
    Timestamp,
    useEffect,
    useMemo,
    useReducer,
    useState,
} from "@webpack/common";

interface Props {
    modalProps: RenderModalProps;
    onEdit(pin: StoredPin): void;
    onDelete(pin: StoredPin): void;
}

interface FilterOption {
    label: string;
    value: string;
}

type SortOrder = "newest" | "oldest";

type Availability = {
    label: string;
    canOpen: boolean;
};

function makeFilterOptions(pins: StoredPin[], field: "tags" | "guildName" | "channelName" | "authorName"): FilterOption[] {
    const values = new Set<string>();
    for (const pin of pins) {
        if (field === "tags") {
            pin.tags.forEach(tag => values.add(tag));
        } else {
            const value = pin[field];
            if (value) values.add(value);
        }
    }

    return [
        { label: "All", value: "" },
        ...Array.from(values)
            .sort((a, b) => a.localeCompare(b))
            .map(value => ({ label: value, value })),
    ];
}

function getAvailability(pin: StoredPin): Availability {
    const channel = ChannelStore.getChannel(pin.channelId);
    if (!channel) return { label: "Channel unavailable", canOpen: false };
    if (!channel.isPrivate() && !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel)) {
        return { label: "Channel unavailable", canOpen: false };
    }

    const message = MessageStore.getMessage(pin.channelId, pin.messageId);
    if (message?.deleted) return { label: "Original message deleted", canOpen: false };
    if (message) return { label: "Original message available", canOpen: true };

    return { label: "Original message not currently loaded", canOpen: true };
}

function searchableText(pin: StoredPin) {
    return [
        pin.content,
        pin.note,
        pin.authorName,
        pin.channelName,
        pin.guildName,
        ...pin.tags,
    ].filter(Boolean).join(" ").toLocaleLowerCase();
}

function PinRow({ pin, onEdit, onDelete, onClose }: {
    pin: StoredPin;
    onEdit(pin: StoredPin): void;
    onDelete(pin: StoredPin): void;
    onClose(): void;
}) {
    const availability = getAvailability(pin);
    const indicators = [
        pin.attachmentCount && `${pin.attachmentCount} attachment${pin.attachmentCount === 1 ? "" : "s"}`,
        pin.embedCount && `${pin.embedCount} embed${pin.embedCount === 1 ? "" : "s"}`,
        pin.stickerCount && `${pin.stickerCount} sticker${pin.stickerCount === 1 ? "" : "s"}`,
    ].filter(Boolean);

    function openOriginal() {
        if (!availability.canOpen) return;
        onClose();
        MessageActions.jumpToMessage({
            channelId: pin.channelId,
            messageId: pin.messageId,
            flash: true,
            jumpType: "INSTANT",
        });
    }

    function copyMessageLink() {
        const guildId = pin.guildId ?? "@me";
        copyWithToast(
            `https://discord.com/channels/${guildId}/${pin.channelId}/${pin.messageId}`,
            "Message link copied."
        );
    }

    return (
        <article className="vc-context-pins-row" role="listitem">
            <div className="vc-context-pins-row-header">
                <Text variant="text-sm/semibold">{pin.authorName}</Text>
                <span className="vc-context-pins-row-location">
                    {pin.guildName ? `${pin.guildName} · ` : ""}{pin.channelName}
                </span>
                <Timestamp timestamp={new Date(pin.messageTimestamp)} />
            </div>
            <div className="vc-context-pins-row-content">
                {pin.content || <span className="vc-context-pins-muted">No text content</span>}
            </div>
            {pin.note && <div className="vc-context-pins-row-note">{pin.note}</div>}
            <div className="vc-context-pins-row-meta">
                <span className={availability.canOpen ? "" : "vc-context-pins-unavailable"}>{availability.label}</span>
                {indicators.length > 0 && <span>{indicators.join(" · ")}</span>}
                {pin.tags.length > 0 && (
                    <div className="vc-context-pins-tags" aria-label="Tags">
                        {pin.tags.map(tag => <span className="vc-context-pins-tag" key={tag}>{tag}</span>)}
                    </div>
                )}
            </div>
            <div className="vc-context-pins-row-actions">
                <Button variant="secondary" size="small" onClick={openOriginal} disabled={!availability.canOpen}>
                    Open original
                </Button>
                <TextButton variant="secondary" onClick={copyMessageLink}>Copy link</TextButton>
                <TextButton variant="primary" onClick={() => onEdit(pin)}>Edit</TextButton>
                <TextButton variant="danger" onClick={() => onDelete(pin)}>Delete</TextButton>
            </div>
        </article>
    );
}

export default function ContextPinsModal({ modalProps, onEdit, onDelete }: Props) {
    const [, refresh] = useReducer(value => value + 1, 0);
    const [query, setQuery] = useState("");
    const [tag, setTag] = useState("");
    const [guild, setGuild] = useState("");
    const [channel, setChannel] = useState("");
    const [author, setAuthor] = useState("");
    const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
    const storageState = getStorageState();
    const pins = getPins();

    useEffect(() => subscribe(refresh), []);

    const filterOptions = useMemo(() => ({
        tags: makeFilterOptions(pins, "tags"),
        guilds: makeFilterOptions(pins, "guildName"),
        channels: makeFilterOptions(pins, "channelName"),
        authors: makeFilterOptions(pins, "authorName"),
    }), [pins]);

    const hasActiveSearchOrFilters = Boolean(query.trim() || tag || guild || channel || author);

    function clearSearchAndFilters() {
        setQuery("");
        setTag("");
        setGuild("");
        setChannel("");
        setAuthor("");
    }

    const filteredPins = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        return [...pins]
            .sort((a, b) => sortOrder === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt)
            .filter(pin => {
                if (normalizedQuery && !searchableText(pin).includes(normalizedQuery)) return false;
                if (tag && !pin.tags.some(value => value.toLocaleLowerCase() === tag.toLocaleLowerCase())) return false;
                if (guild && pin.guildName !== guild) return false;
                if (channel && pin.channelName !== channel) return false;
                if (author && pin.authorName !== author) return false;
                return true;
            });
    }, [author, channel, guild, pins, query, sortOrder, tag]);

    const storageError = getStorageError();
    const resultSummary = hasActiveSearchOrFilters
        ? `Showing ${filteredPins.length} of ${pins.length} ${pins.length === 1 ? "pin" : "pins"}`
        : `${pins.length} ${pins.length === 1 ? "pin" : "pins"}`;

    return (
        <div className="vc-context-pins-modal-content">
            {storageState === "loading" && (
                <div className="vc-context-pins-state" role="status">Loading your Context Pins...</div>
            )}
            {storageState === "error" && (
                <div className="vc-context-pins-state vc-context-pins-state-error" role="alert">
                    {storageError?.message || "Context Pins storage is unavailable."}
                </div>
            )}
            {storageState === "ready" && (
                <>
                    <div className="vc-context-pins-controls">
                        <label className="vc-context-pins-search">
                            <Forms.FormTitle tag="h5">Search</Forms.FormTitle>
                            <TextInput
                                value={query}
                                onChange={setQuery}
                                placeholder="Search your pins"
                                aria-label="Search Context Pins"
                            />
                        </label>
                        <div className="vc-context-pins-filters">
                            <div className="vc-context-pins-filter">
                                <Forms.FormTitle tag="h5">Tag</Forms.FormTitle>
                                <SearchableSelect
                                    options={filterOptions.tags}
                                    value={tag}
                                    onChange={setTag}
                                    closeOnSelect={true}
                                    placeholder="All"
                                    maxVisibleItems={6}
                                />
                            </div>
                            <div className="vc-context-pins-filter">
                                <Forms.FormTitle tag="h5">Server</Forms.FormTitle>
                                <SearchableSelect
                                    options={filterOptions.guilds}
                                    value={guild}
                                    onChange={setGuild}
                                    closeOnSelect={true}
                                    placeholder="All"
                                    maxVisibleItems={6}
                                />
                            </div>
                            <div className="vc-context-pins-filter">
                                <Forms.FormTitle tag="h5">Channel</Forms.FormTitle>
                                <SearchableSelect
                                    options={filterOptions.channels}
                                    value={channel}
                                    onChange={setChannel}
                                    closeOnSelect={true}
                                    placeholder="All"
                                    maxVisibleItems={6}
                                />
                            </div>
                            <div className="vc-context-pins-filter">
                                <Forms.FormTitle tag="h5">Author</Forms.FormTitle>
                                <SearchableSelect
                                    options={filterOptions.authors}
                                    value={author}
                                    onChange={setAuthor}
                                    closeOnSelect={true}
                                    placeholder="All"
                                    maxVisibleItems={6}
                                />
                            </div>
                        </div>
                        <div className="vc-context-pins-toolbar">
                            <span className="vc-context-pins-result-count" aria-live="polite" aria-atomic="true">
                                {resultSummary}
                            </span>
                            <div className="vc-context-pins-toolbar-actions">
                                <div className="vc-context-pins-sort">
                                    <Forms.FormTitle tag="h5">Sort by</Forms.FormTitle>
                                    <Select
                                        options={[
                                            { label: "Newest saved", value: "newest", default: true },
                                            { label: "Oldest saved", value: "oldest" },
                                        ]}
                                        select={value => setSortOrder(value as SortOrder)}
                                        isSelected={value => value === sortOrder}
                                        serialize={String}
                                        closeOnSelect={true}
                                        placeholder="Sort pins"
                                    />
                                </div>
                                <TextButton
                                    className="vc-context-pins-clear"
                                    variant="secondary"
                                    onClick={clearSearchAndFilters}
                                    disabled={!hasActiveSearchOrFilters}
                                >
                                    Clear search and filters
                                </TextButton>
                            </div>
                        </div>
                    </div>

                    {!pins.length ? (
                        <div className="vc-context-pins-state">
                            <Text variant="heading-md/semibold">No Context Pins yet</Text>
                            <span>Save a message from its context menu to find it here.</span>
                        </div>
                    ) : !filteredPins.length ? (
                        <div className="vc-context-pins-state">
                            <Text variant="heading-md/semibold">No matching pins</Text>
                            <span>Try changing your search or filters.</span>
                        </div>
                    ) : (
                        <ScrollerThin className="vc-context-pins-list" orientation="auto">
                            <div role="list">
                                {filteredPins.map(pin => (
                                    <PinRow
                                        key={makePinKey(pin.channelId, pin.messageId)}
                                        pin={pin}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onClose={modalProps.onClose}
                                    />
                                ))}
                            </div>
                        </ScrollerThin>
                    )}
                </>
            )}
        </div>
    );
}

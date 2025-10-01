/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./modal.css";

import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { identity } from "@utils/misc";
import { saveFile } from "@utils/web";
import { Channel, Message } from "@vencord/discord-types";
import {
    Button,
    ChannelStore,
    Forms,
    GuildStore,
    SearchableSelect,
    Select,
    SelectedChannelStore,
    Switch,
    Text,
    TextInput,
    Toasts,
    showToast,
    useCallback,
    useMemo,
    useState
} from "@webpack/common";

import { collectMessages } from "./collect";
import { MAX_FETCH_LIMIT } from "./constants";
import { applyFilters } from "./filters";
import { formatTranscript } from "./formatters";
import { settings } from "./settings";
import type { ExportFormat, TranscriptRequest } from "./types";
import {
    extractAuthorIds,
    getChannelDisplayName,
    isTextBasedChannel,
    parseDateInput,
    safeGetChannel
} from "./utils";

interface ChannelOption {
    label: string;
    value: string;
}

interface TranscriptModalProps {
    modalProps: ModalProps;
    initialChannelId?: string;
    pivotMessage?: Message;
}

function buildChannelOptions(): ChannelOption[] {
    const options: ChannelOption[] = [];

    const privateChannels = ChannelStore.getMutablePrivateChannels?.();
    if (privateChannels) {
        for (const channel of Object.values(privateChannels) as Channel[]) {
            if (!isTextBasedChannel(channel)) continue;
            options.push({
                value: channel.id,
                label: getChannelDisplayName(channel)
            });
        }
    }

    for (const guildId of GuildStore.getGuildIds?.() ?? []) {
        const guild = GuildStore.getGuild(guildId);
        const guildChannels = ChannelStore.getMutableGuildChannelsForGuild?.(guildId);
        if (!guildChannels) continue;

        const channels = (Object.values(guildChannels) as Channel[])
            .filter(isTextBasedChannel)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        for (const channel of channels) {
            options.push({
                value: channel.id,
                label: `${guild?.name ?? "Unknown Guild"} - #${channel.name ?? channel.id}`
            });
        }
    }

    return options;
}

function TranscriptModal({ modalProps, initialChannelId, pivotMessage }: TranscriptModalProps) {
    const [channelId, setChannelId] = useState(initialChannelId ?? SelectedChannelStore.getChannelId());
    const [format, setFormat] = useState<ExportFormat>(settings.store.defaultFormat ?? "html");
    const [maxMessages, setMaxMessages] = useState(String(settings.store.defaultLimit ?? 500));
    const [startInput, setStartInput] = useState("");
    const [fromStart, setFromStart] = useState(false);
    const [endInput, setEndInput] = useState(pivotMessage ? new Date(pivotMessage.timestamp).toISOString() : "");
    const [toNow, setToNow] = useState(!pivotMessage);
    const [onlyPinned, setOnlyPinned] = useState(false);
    const [onlyWithMedia, setOnlyWithMedia] = useState(false);
    const [includeBots, setIncludeBots] = useState<boolean>(settings.store.includeBots ?? true);
    const [includeSystem, setIncludeSystem] = useState<boolean>(settings.store.includeSystem ?? false);
    const [includeAttachments, setIncludeAttachments] = useState<boolean>(settings.store.includeAttachments ?? true);
    const [includeEmbeds, setIncludeEmbeds] = useState<boolean>(settings.store.includeEmbeds ?? true);
    const [includeReactions, setIncludeReactions] = useState<boolean>(settings.store.includeReactions ?? true);
    const [includeEdits, setIncludeEdits] = useState<boolean>(settings.store.includeEdits ?? true);
    const [includeMentions, setIncludeMentions] = useState<boolean>(settings.store.includeMentions ?? false);
    const [includeReferenced, setIncludeReferenced] = useState<boolean>(settings.store.includeReferenced ?? true);
    const [groupByDay, setGroupByDay] = useState<boolean>(settings.store.groupByDay ?? true);
    const [keyword, setKeyword] = useState("");
    const [authorFilter, setAuthorFilter] = useState("");
    const [includePivot, setIncludePivot] = useState(true);
    const [anchorToPivot, setAnchorToPivot] = useState<boolean>(Boolean(pivotMessage));
    const [progress, setProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const channelOptions = useMemo(() => buildChannelOptions(), []);
    const selectedChannel = safeGetChannel(channelId);
    const channelName = getChannelDisplayName(selectedChannel);

    const selectedOption = useMemo(() => {
        if (!channelId) return undefined;
        return channelOptions.find(option => option.value === channelId) ?? {
            value: channelId,
            label: channelName
        };
    }, [channelId, channelOptions, channelName]);

    const endValue = useMemo(() => {
        if (anchorToPivot && pivotMessage) return new Date(pivotMessage.timestamp).toISOString();
        if (toNow) return new Date().toISOString();
        return endInput;
    }, [anchorToPivot, pivotMessage, toNow, endInput]);

    const handleGenerate = useCallback(async () => {
        const targetChannelId = channelId ?? "";
        if (!targetChannelId) {
            setError("Please select a channel to export.");
            return;
        }

        const limit = Number.parseInt(maxMessages, 10);
        if (!Number.isFinite(limit) || limit <= 0) {
            setError("Message limit must be a positive number.");
            return;
        }
        if (limit > MAX_FETCH_LIMIT) {
            setError(`Message limit cannot exceed ${MAX_FETCH_LIMIT}.`);
            return;
        }

        const startTs = fromStart ? null : parseDateInput(startInput);
        if (!fromStart && startInput.trim() && startTs == null) {
            setError("Invalid \"From\" value. Use ISO strings (2025-01-01) or relative expressions like -7d.");
            return;
        }

        let endTs: number | null = null;
        if (anchorToPivot && pivotMessage) {
            endTs = Date.parse(pivotMessage.timestamp);
        } else if (!toNow && endValue.trim()) {
            endTs = parseDateInput(endValue);
            if (endTs == null) {
                setError("Invalid \"To\" value. Use ISO strings (2025-01-31) or relative expressions like -1d.");
                return;
            }
        } else if (toNow) {
            endTs = Date.now();
        }

        if (startTs != null && endTs != null && startTs > endTs) {
            setError("The \"From\" timestamp must be earlier than the \"To\" timestamp.");
            return;
        }

        const authorIds = extractAuthorIds(authorFilter);

        const request: TranscriptRequest = {
            channelId: targetChannelId,
            limit,
            startTs,
            endTs,
            fromStart,
            includeBots,
            includeSystem,
            onlyPinned,
            onlyWithMedia,
            authorIds,
            keyword,
            includeAttachments,
            includeEmbeds,
            includeReactions,
            includeEdits,
            includeMentions,
            includeReferenced,
            groupByDay,
            format,
            pivotMessage,
            includePivot
        };

        setError(null);
        setBusy(true);
        setProgress("Fetching messages...");

        try {
            const messages = await collectMessages(request.channelId, {
                limit: request.limit,
                startTs: request.startTs,
                endTs: request.endTs,
                pivotId: anchorToPivot && pivotMessage ? pivotMessage.id : undefined,
                fromStart: request.fromStart,
                onProgress: count => setProgress(`Fetched ${count}/${request.limit} messages...`)
            });

            const mergedMessages = request.includePivot && pivotMessage && !messages.some(m => m.id === pivotMessage.id)
                ? [...messages, pivotMessage]
                : messages;

            const filtered = applyFilters(mergedMessages, {
                startTs: request.startTs,
                endTs: request.endTs,
                includeBots: request.includeBots,
                includeSystem: request.includeSystem,
                onlyPinned: request.onlyPinned,
                onlyWithMedia: request.onlyWithMedia,
                authorIds: request.authorIds,
                keyword: request.keyword,
                includeAttachments: request.includeAttachments,
                includeEmbeds: request.includeEmbeds
            });

            if (!filtered.length) {
                setError("No messages matched the selected filters.");
                setProgress(null);
                return;
            }

            setProgress("Formatting transcript...");

            const transcript = formatTranscript(filtered, {
                format: request.format,
                channel: selectedChannel,
                includeAttachments: request.includeAttachments,
                includeEmbeds: request.includeEmbeds,
                includeReactions: request.includeReactions,
                includeEdits: request.includeEdits,
                includeMentions: request.includeMentions,
                includeReferenced: request.includeReferenced,
                groupByDay: request.groupByDay,
                fromStart: request.fromStart
            });

            const filename = `${transcript.filenameHint}.${transcript.extension}`;
            saveFile(new File([transcript.content], filename, { type: transcript.mime }));
            showToast(`Saved transcript with ${filtered.length} messages.`, Toasts.Type.SUCCESS);
            modalProps.onClose?.();
        } catch (err) {
            console.error("[Transcript] Failed to create transcript", err);
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            showToast(`Failed to generate transcript: ${message}`, Toasts.Type.FAILURE);
        } finally {
            setBusy(false);
            setProgress(null);
        }
    }, [
        anchorToPivot,
        authorFilter,
        channelId,
        endValue,
        format,
        fromStart,
        includeAttachments,
        includeBots,
        includeEdits,
        includeEmbeds,
        includeMentions,
        includePivot,
        includeReactions,
        includeReferenced,
        includeSystem,
        keyword,
        maxMessages,
        modalProps,
        onlyPinned,
        onlyWithMedia,
        pivotMessage,
        selectedChannel,
        startInput,
        toNow
    ]);

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Create Transcript</Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent>
                <Forms.FormSection>
                    <Forms.FormTitle tag="h5">Channel or DM</Forms.FormTitle>
                    <Forms.FormText>Select where to pull messages from. You can search by name or ID.</Forms.FormText>
                    <SearchableSelect
                        placeholder="Select a channel"
                        options={channelOptions}
                        value={selectedOption}
                        onChange={value => setChannelId(value ?? "")}
                        maxVisibleItems={8}
                        closeOnSelect
                    />
                </Forms.FormSection>

                <Forms.FormDivider />

                <Forms.FormSection>
                    <Forms.FormTitle tag="h5">Export Options</Forms.FormTitle>
                    <Select
                        placeholder="Export format"
                        options={[
                            { label: "HTML (.html)", value: "html", default: true },
                            { label: "Markdown (.md)", value: "markdown" },
                            { label: "JSON (.json)", value: "json" }
                        ] satisfies Array<{ value: ExportFormat; label: string; default?: boolean; }>}
                        select={value => setFormat(value)}
                        isSelected={value => value === format}
                        serialize={identity}
                        closeOnSelect
                    />

                    <Forms.FormText className="vc-transcript-field-label">Maximum messages to fetch (1 – {MAX_FETCH_LIMIT})</Forms.FormText>
                    <TextInput
                        value={maxMessages}
                        onChange={value => setMaxMessages(value.replace(/[^0-9]/g, ""))}
                        placeholder="500"
                    />
                </Forms.FormSection>

                <Forms.FormDivider />

                <Forms.FormSection>
                    <Forms.FormTitle tag="h5">Time Range</Forms.FormTitle>
                    <Forms.FormText>Accepts ISO timestamps (2025-01-01T12:00) or relative shorthand like -7d (7 days ago), +2h (two hours ahead) or "now".</Forms.FormText>
                    <Switch value={fromStart} onChange={setFromStart} hideBorder>Start from the first message</Switch>
                    {!fromStart && (
                        <>
                            <Forms.FormText className="vc-transcript-field-label">From</Forms.FormText>
                            <TextInput value={startInput} onChange={setStartInput} placeholder="2025-01-01 or -7d" />
                        </>
                    )}

                    <Switch value={toNow} onChange={setToNow} hideBorder disabled={Boolean(pivotMessage && anchorToPivot)}>Up to now</Switch>
                    {pivotMessage && (
                        <Switch
                            value={anchorToPivot}
                            onChange={setAnchorToPivot}
                            note="Use the clicked message as the newest entry"
                            hideBorder
                        >
                            Anchor to selected message
                        </Switch>
                    )}

                    {(!toNow || (pivotMessage && !anchorToPivot)) && (
                        <>
                            <Forms.FormText className="vc-transcript-field-label">To</Forms.FormText>
                            <TextInput
                                value={endValue}
                                onChange={value => { setAnchorToPivot(false); setToNow(false); setEndInput(value); }}
                                placeholder="2025-01-31 or now"
                                editable={!anchorToPivot || !pivotMessage}
                            />
                        </>
                    )}
                </Forms.FormSection>

                <Forms.FormDivider />

                <Forms.FormSection>
                    <Forms.FormTitle tag="h5">Filters</Forms.FormTitle>
                    <Switch value={onlyPinned} onChange={setOnlyPinned} hideBorder>Only pinned messages</Switch>
                    <Switch value={onlyWithMedia} onChange={setOnlyWithMedia} hideBorder>Only messages with attachments or embeds</Switch>
                    <Switch value={includeBots} onChange={setIncludeBots} hideBorder>Include bot messages</Switch>
                    <Switch value={includeSystem} onChange={setIncludeSystem} hideBorder>Include system and service messages</Switch>

                    <Forms.FormText className="vc-transcript-field-label">Author filter (IDs, mentions, usernames)</Forms.FormText>
                    <TextInput
                        value={authorFilter}
                        onChange={setAuthorFilter}
                        placeholder="123456789012345678, <@987654321098765432>"
                    />

                    <Forms.FormText className="vc-transcript-field-label">Keyword filter (case insensitive)</Forms.FormText>
                    <TextInput value={keyword} onChange={setKeyword} placeholder="error" />
                </Forms.FormSection>

                <Forms.FormDivider />

                <Forms.FormSection>
                    <Forms.FormTitle tag="h5">Included Details</Forms.FormTitle>
                    <Switch value={includeAttachments} onChange={setIncludeAttachments} hideBorder>Include attachments</Switch>
                    <Switch value={includeEmbeds} onChange={setIncludeEmbeds} hideBorder>Include embeds</Switch>
                    <Switch value={includeReactions} onChange={setIncludeReactions} hideBorder>Include reactions</Switch>
                    <Switch value={includeEdits} onChange={setIncludeEdits} hideBorder>Show edited timestamps</Switch>
                    <Switch value={includeMentions} onChange={setIncludeMentions} hideBorder>Include mention metadata</Switch>
                    <Switch value={includeReferenced} onChange={setIncludeReferenced} hideBorder>Include reply context</Switch>
                    <Switch value={groupByDay} onChange={setGroupByDay} hideBorder>Group HTML exports by day</Switch>
                    {pivotMessage && (
                        <Switch value={includePivot} onChange={setIncludePivot} hideBorder>Include anchored message in export</Switch>
                    )}
                </Forms.FormSection>

                {error && (
                    <Forms.FormSection>
                        <Forms.FormText style={{ color: "var(--status-danger-500)" }}>{error}</Forms.FormText>
                    </Forms.FormSection>
                )}

                {progress && (
                    <Forms.FormSection>
                        <Forms.FormText>{progress}</Forms.FormText>
                    </Forms.FormSection>
                )}
            </ModalContent>

            <ModalFooter>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    onClick={modalProps.onClose}
                    disabled={busy}
                >
                    Cancel
                </Button>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={handleGenerate}
                    disabled={busy}
                >
                    {busy ? "Generating..." : "Generate Transcript"}
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

function openTranscriptModal(options?: { channelId?: string; message?: Message; }) {
    openModal(modalProps => (
        <TranscriptModal
            modalProps={modalProps}
            initialChannelId={options?.channelId}
            pivotMessage={options?.message}
        />
    ));
}

export { openTranscriptModal };


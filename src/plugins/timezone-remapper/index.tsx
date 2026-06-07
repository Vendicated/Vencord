/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import { MessageObject } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { FormSwitch } from "@components/FormSwitch";
// @ts-ignore
import { Devs } from "@utils/constants";
import { copyWithToast,insertTextIntoChatInputBox, sendMessage } from "@utils/discord";
import { Margins } from "@utils/margins";
// @ts-ignore
import definePlugin, { OptionType } from "@utils/types";
import {
    ComponentDispatch,
    DraftStore,
    DraftType,
    FluxDispatcher,
    Forms,
    MessageActions,
    Modal,
    openModal,
    Parser,
    PendingReplyStore,
    React,
    Select,
    SelectedChannelStore,
    useMemo,
    useState } from "@webpack/common";

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable natural language timezone remapping",
        default: true
    },
    defaultFormat: {
        type: OptionType.SELECT,
        description: "Default Discord timestamp display format",
        options: [
            { label: "Short Time (e.g., 9:30 PM)", value: "t", default: true },
            { label: "Long Time (e.g., 9:30:12 PM)", value: "T" },
            { label: "Short Date (e.g., 06/06/2026)", value: "d" },
            { label: "Long Date (e.g., June 6, 2026)", value: "D" },
            { label: "Short Date/Time (e.g., June 6, 2026 9:30 PM)", value: "f" },
            { label: "Long Date/Time (e.g., Saturday, June 6, 2026 9:30 PM)", value: "F" },
            { label: "Relative (e.g., in 2 hours)", value: "R" }
        ]
    }
});

const months: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
};

function getUnixMarkdown(date: Date, format: string): string {
    const unix = Math.round(date.getTime() / 1000);
    return `<t:${unix}:${format}>`;
}

function parseDateTime(
    dayStr?: string,
    dateStr?: string,
    hourStr?: string,
    minStr?: string,
    periodStr?: string,
    format: string = "t"
): string {
    const now = new Date();
    const target = new Date(now);
    console.info(`[Timezone Remapper] Parsing inputs: dayStr=${dayStr}, dateStr=${dateStr}, hourStr=${hourStr}, minStr=${minStr}, periodStr=${periodStr}`);

    if (dayStr) {
        const dayLower = dayStr.toLowerCase();
        if (dayLower.startsWith("tom") || dayLower.includes("morrow")) {
            target.setDate(target.getDate() + 1);
        }
    } else if (dateStr) {
        const dateClean = dateStr.trim().toLowerCase();
        const numMatch = dateClean.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
        if (numMatch) {
            const p1 = parseInt(numMatch[1], 10);
            const p2 = parseInt(numMatch[2], 10);
            let year = numMatch[3] ? parseInt(numMatch[3], 10) : target.getFullYear();
            if (year < 100) year += 2000;

            let day = p1;
            let month = p2 - 1;

            if (p2 > 12) {
                day = p2;
                month = p1 - 1;
            }

            target.setFullYear(year, month, day);
        } else {
            const monthNameMatch = dateClean.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);
            const dayNumMatch = dateClean.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);

            if (monthNameMatch && dayNumMatch) {
                const month = months[monthNameMatch[1]];
                const day = parseInt(dayNumMatch[1], 10);
                target.setMonth(month, day);
            }
        }
    }

    if (hourStr) {
        let hour = parseInt(hourStr, 10);
        const minute = minStr ? parseInt(minStr, 10) : 0;

        if (periodStr) {
            const period = periodStr.toLowerCase();
            if (period === "pm" && hour < 12) {
                hour += 12;
            } else if (period === "am" && hour === 12) {
                hour = 0;
            }
        }

        target.setHours(hour, minute, 0, 0);

        if (!dayStr && !dateStr && target.getTime() < now.getTime()) {
            target.setDate(target.getDate() + 1);
        }
    } else {

        target.setSeconds(0, 0);
    }

    const res = getUnixMarkdown(target, format);
    console.info(`[Timezone Remapper] Resolved date: ${target.toString()} -> Timestamp: ${res}`);
    return res;
}

function remapTimezones(text: string, format: string): string {
    let result = text;

    const p1 = /(?<=^|\s)@(tom+or+ow|to[- ]morrow|today)\b\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?\b/gi;
    result = result.replace(p1, (_, day, hour, min, period) => {
        return parseDateTime(day, undefined, hour, min, period, format);
    });

    const p2 = /(?<=^|\s)@(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?\s+(tom+or+ow|to[- ]morrow|today)\b/gi;
    result = result.replace(p2, (_, hour, min, period, day) => {
        return parseDateTime(day, undefined, hour, min, period, format);
    });

    const p3 = /(?<=^|\s)@(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?\s+(\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\b/gi;
    result = result.replace(p3, (_, hour, min, period, date) => {
        return parseDateTime(undefined, date, hour, min, period, format);
    });

    const p4 = /(?<=^|\s)@(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi;
    result = result.replace(p4, (_, hour, min, period) => {
        return parseDateTime(undefined, undefined, hour, min, period, format);
    });

    const p5 = /(?<=^|\s)@(\d{1,2}):(\d{2})(?:\s*(am|pm))?\b/gi;
    result = result.replace(p5, (_, hour, min, period) => {
        return parseDateTime(undefined, undefined, hour, min, period, format);
    });

    const p6 = /(?<=^|\s)@(tom+or+ow|to[- ]morrow|today)\b/gi;
    result = result.replace(p6, (_, day) => {
        return parseDateTime(day, undefined, undefined, undefined, undefined, format);
    });

    return result;
}

function ClockIcon() {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function findSlateEditor(element: HTMLElement): any {
    let el: HTMLElement | null = element;
    while (el) {
        const reactKey = Object.keys(el).find(
            key => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")
        );
        if (reactKey) {
            let node = (el as any)[reactKey];
            while (node) {
                if (node.memoizedProps?.editor) {
                    return node.memoizedProps.editor;
                }
                if (node.pendingProps?.editor) {
                    return node.pendingProps.editor;
                }
                node = node.return;
            }
        }
        el = el.parentElement;
    }
    return null;
}

interface RemapperModalProps {
    onClose: () => void;
    transitionState: number;
    channelId?: string;
}

const FormatsList = ["t", "T", "d", "D", "f", "F", "R"] as const;
type FormatType = typeof FormatsList[number];

const formatLabels: Record<FormatType, string> = {
    t: "Short Time (e.g., 9:30 PM)",
    T: "Long Time (e.g., 9:30:12 PM)",
    d: "Short Date (e.g., 06/06/2026)",
    D: "Long Date (e.g., June 6, 2026)",
    f: "Short Date/Time (e.g., June 6, 2026 9:30 PM)",
    F: "Long Date/Time (e.g., Saturday, June 6, 2026 9:30 PM)",
    R: "Relative (e.g., in 2 hours)"
};

function RemapperModal({ onClose, transitionState, channelId }: RemapperModalProps) {
    const [timeInput, setTimeInput] = useState("");
    const [dayInput, setDayInput] = useState("");
    const [format, setFormat] = useState<FormatType>(settings.store.defaultFormat as FormatType);
    const [sendDirect, setSendDirect] = useState(false);

    const generatedTimestamp = useMemo(() => {
        let parsedDay: string | undefined = undefined;
        let parsedDate: string | undefined = undefined;
        let parsedHour: string | undefined = undefined;
        let parsedMin: string | undefined = undefined;
        let parsedPeriod: string | undefined = undefined;

        if (dayInput) {
            const dayLower = dayInput.toLowerCase().trim();
            if (dayLower.startsWith("tom") || dayLower.includes("morrow") || dayLower === "today") {
                parsedDay = dayLower;
            } else {
                parsedDate = dayLower;
            }
        }

        if (timeInput) {
            const timeClean = timeInput.trim().toLowerCase();
            const timeMatch = timeClean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
            if (timeMatch) {
                parsedHour = timeMatch[1];
                parsedMin = timeMatch[2];
                parsedPeriod = timeMatch[3];
            }
        }

        return parseDateTime(parsedDay, parsedDate, parsedHour, parsedMin, parsedPeriod, format);
    }, [timeInput, dayInput, format]);

    const renderedPreview = useMemo(() => {
        try {
            return Parser.parse(generatedTimestamp);
        } catch {
            return generatedTimestamp;
        }
    }, [generatedTimestamp]);

    const dispatchBackspace = (element: Element, ctrlKey = false) => {
        element.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Backspace",
            code: "Backspace",
            keyCode: 8,
            which: 8,
            ctrlKey,
            bubbles: true,
            cancelable: true
        }));
        element.dispatchEvent(new KeyboardEvent("keyup", {
            key: "Backspace",
            code: "Backspace",
            keyCode: 8,
            which: 8,
            ctrlKey,
            bubbles: true,
            cancelable: true
        }));
    };

    const handleInsert = () => {
        if (!channelId) {
            insertTextIntoChatInputBox(generatedTimestamp);
            ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
            onClose();
            return;
        }

        if (sendDirect) {
            sendMessage(
                channelId,
                { content: generatedTimestamp },
                false,
                MessageActions.getSendMessageOptionsForReply(PendingReplyStore.getPendingReply(channelId))
            ).then(() => {
                FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
            });
        } else {
            const draft = DraftStore.getDraft(channelId, DraftType.ChannelMessage) || "";
            let idx = draft.lastIndexOf("@retime");
            let replaceLen = 7;

            if (idx === -1) {
                idx = draft.lastIndexOf("<@retime>");
                if (idx !== -1) {
                    replaceLen = 9;
                }
            }

            if (idx !== -1) {
                const hasTrailingSpace = draft.slice(idx).startsWith("@retime ") || draft.slice(idx).startsWith("<@retime> ");
                const finalReplaceLen = hasTrailingSpace ? replaceLen + 1 : replaceLen;

                ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
                setTimeout(() => {
                    const textarea = document.querySelector('[class*="textArea-"] [contenteditable="true"]') as HTMLElement;
                    let deleted = false;
                    if (textarea) {
                        const editor = findSlateEditor(textarea);
                        if (editor && typeof editor.deleteBackward === "function") {
                            for (let i = 0; i < finalReplaceLen; i++) {
                                editor.deleteBackward("character");
                            }
                            if (typeof editor.insertText === "function") {
                                editor.insertText(generatedTimestamp + " ");
                            } else {
                                insertTextIntoChatInputBox(generatedTimestamp + " ");
                            }
                            deleted = true;
                        }
                    }

                    if (!deleted) {
                        const selection = window.getSelection();
                        if (selection) {
                            for (let i = 0; i < finalReplaceLen; i++) {
                                selection.modify("extend", "backward", "character");
                            }
                            setTimeout(() => {
                                insertTextIntoChatInputBox(generatedTimestamp + " ");
                            }, 50);
                        } else {
                            insertTextIntoChatInputBox(generatedTimestamp + " ");
                        }
                    }
                }, 10);
            } else {
                insertTextIntoChatInputBox(generatedTimestamp + " ");
                ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
            }
        }
        onClose();
    };

    const handleCopy = () => {
        copyWithToast(generatedTimestamp, "Copied timestamp to clipboard!");
        if (channelId) {
            const draft = DraftStore.getDraft(channelId, DraftType.ChannelMessage) || "";
            let idx = draft.lastIndexOf("@retime");
            let replaceLen = 7;

            if (idx === -1) {
                idx = draft.lastIndexOf("<@retime>");
                if (idx !== -1) {
                    replaceLen = 9;
                }
            }

            if (idx !== -1) {
                const hasTrailingSpace = draft.slice(idx).startsWith("@retime ") || draft.slice(idx).startsWith("<@retime> ");
                const finalReplaceLen = hasTrailingSpace ? replaceLen + 1 : replaceLen;

                ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
                setTimeout(() => {
                    const textarea = document.querySelector('[class*="textArea-"] [contenteditable="true"]') as HTMLElement;
                    let deleted = false;
                    if (textarea) {
                        const editor = findSlateEditor(textarea);
                        if (editor && typeof editor.deleteBackward === "function") {
                            for (let i = 0; i < finalReplaceLen; i++) {
                                editor.deleteBackward("character");
                            }
                            deleted = true;
                        }
                    }

                    if (!deleted) {
                        const selection = window.getSelection();
                        if (selection) {
                            for (let i = 0; i < finalReplaceLen; i++) {
                                selection.modify("extend", "backward", "character");
                            }
                            setTimeout(() => {
                                insertTextIntoChatInputBox("");
                            }, 50);
                        }
                    }
                    ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
                }, 10);
            } else {
                ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
            }
        }
        onClose();
    };

    return (
        <Modal
            transitionState={transitionState}
            onClose={onClose}
            title="Timezone Remapper Helper"
            actions={[{
                text: "Insert",
                variant: "primary",
                onClick: handleInsert
            }, {
                text: "Copy",
                variant: "secondary",
                onClick: handleCopy
            }, {
                text: "Cancel",
                variant: "secondary",
                onClick: onClose
            }]}
        >
            <div className="vc-retime-modal-content">
                <div className="vc-retime-input-group">
                    <label>Time</label>
                    <input
                        type="text"
                        placeholder="e.g. 3pm, 9:30, 14:00, or leave blank"
                        className="vc-retime-input"
                        value={timeInput}
                        onChange={e => setTimeInput(e.currentTarget.value)}
                    />
                </div>

                <div className="vc-retime-input-group">
                    <label>Day / Date</label>
                    <input
                        type="text"
                        placeholder="e.g. today, tomorrow, June 7, 2/2/2026, or leave blank"
                        className="vc-retime-input"
                        value={dayInput}
                        onChange={e => setDayInput(e.currentTarget.value)}
                    />
                </div>

                <div className="vc-retime-input-group">
                    <Forms.FormTitle className={Margins.bottom8}>Display Format</Forms.FormTitle>
                    <div className="vc-retime-select-container">
                        <Select
                            options={FormatsList.map(f => ({
                                label: formatLabels[f],
                                value: f
                            }))}
                            isSelected={v => v === format}
                            select={v => setFormat(v as FormatType)}
                            serialize={v => v}
                        />
                    </div>
                </div>

                <div className="vc-retime-preview-card">
                    <div className="vc-retime-preview-title">Live Preview</div>
                    <div className="vc-retime-preview-value">{renderedPreview}</div>
                    <div className="vc-retime-preview-code">{generatedTimestamp}</div>
                </div>

                <div className="vc-retime-switch-container">
                    <FormSwitch
                        value={sendDirect}
                        onChange={setSendDirect}
                        hideBorder
                        title="Send directly to channel"
                    />
                </div>
            </div>
        </Modal>
    );
}

let lastTriggerDraft = "";

function handleDraftChange({ channelId, draft }: { channelId: string; draft: string }) {
    if (!settings.store.enabled) return;
    if (!draft || typeof draft !== "string") return;

    let idx = draft.lastIndexOf("@retime");
    let matchLen = 7;

    if (idx === -1) {
        idx = draft.lastIndexOf("<@retime>");
        if (idx !== -1) {
            matchLen = 9;
        }
    }

    if (idx === -1) {
        lastTriggerDraft = "";
        return;
    }

    if (draft === lastTriggerDraft) return;

    const afterRetime = draft.slice(idx + matchLen);
    if (afterRetime === "" || afterRetime.startsWith(" ")) {
        lastTriggerDraft = draft;
        openModal(props => (
            <RemapperModal
                {...props}
                channelId={channelId}
            />
        ));
    }
}

export default definePlugin({
    name: "Timezone Remapper",
    description: "Easily convert natural language time shortcuts (like @3pm) into native Discord Unix timestamp markdown.",
    enabledByDefault: true,
    authors: [Devs.almostkoi],
    settings,

    patches: [
        {
            find: "renderResults({results:",
            replacement: [
                {
                    match: /let \i=.{1,100}renderResults\({results:(\i)\.query\.results,/,
                    replace: "$self.handleAutocomplete($1);$&"
                }
            ]
        }
    ],

    handleAutocomplete(state: any) {
        if (!settings.store.enabled) return;
        const query = state?.query;
        if (!query || query.typeInfo?.sentinel !== "@") return;

        const text = (query.text || "").toLowerCase();
        if ("retime".startsWith(text)) {
            if (!query.results) query.results = {};
            if (!query.results.globals) query.results.globals = [];

            const exists = query.results.globals.some((g: any) => g.test === "retime");
            if (!exists) {
                query.results.globals.unshift({
                    test: "retime",
                    get text() {
                        const stack = new Error().stack || "";
                        const isRendering = stack.includes("render") || stack.includes("React") || stack.includes("Component");

                        if (!isRendering) {
                            const channelId = SelectedChannelStore.getChannelId();
                            openModal(props => (
                                <RemapperModal
                                    {...props}
                                    channelId={channelId}
                                />
                            ));
                            return "";
                        }
                        return "@retime";
                    },
                    description: "Refer to a time dynamically in the viewer's time zone"
                });
            }
        }
    },

    commands: [
        {
            name: "retime",
            description: "Refer to a time dynamically in the viewer's time zone",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "time",
                    description: "Specific time (e.g. 3pm, 9:30, 14:00, or leave blank)",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                },
                {
                    name: "day",
                    description: "Day or date (e.g. today, tomorrow, 2/2/2026, June 7, or leave blank)",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                },
                {
                    name: "format",
                    description: "Timestamp display style (defaults to configured style)",
                    type: ApplicationCommandOptionType.STRING,
                    required: false,
                    choices: [
                        { name: "Short Time", label: "Short Time (e.g., 9:30 PM)", value: "t" },
                        { name: "Long Time", label: "Long Time (e.g., 9:30:12 PM)", value: "T" },
                        { name: "Short Date", label: "Short Date (e.g., 06/06/2026)", value: "d" },
                        { name: "Long Date", label: "Long Date (e.g., June 6, 2026)", value: "D" },
                        { name: "Short Date/Time", label: "Short Date/Time (e.g., June 6, 2026 9:30 PM)", value: "f" },
                        { name: "Long Date/Time", label: "Long Date/Time (e.g., Saturday, June 6, 2026 9:30 PM)", value: "F" },
                        { name: "Relative", label: "Relative (e.g., in 2 hours)", value: "R" }
                    ]
                },
                {
                    name: "send",
                    description: "Send the timestamp directly to the channel (default: false)",
                    type: ApplicationCommandOptionType.BOOLEAN,
                    required: false
                }
            ],
            execute(args, { channel }) {
                const timeVal = findOption<string>(args, "time");
                const dayVal = findOption<string>(args, "day");
                const formatVal = findOption<string>(args, "format", settings.store.defaultFormat);
                const sendVal = findOption<boolean>(args, "send", false);

                let parsedDay: string | undefined = undefined;
                let parsedDate: string | undefined = undefined;
                let parsedHour: string | undefined = undefined;
                let parsedMin: string | undefined = undefined;
                let parsedPeriod: string | undefined = undefined;

                if (dayVal) {
                    const dayLower = dayVal.toLowerCase().trim();
                    if (dayLower.startsWith("tom") || dayLower.includes("morrow") || dayLower === "today") {
                        parsedDay = dayLower;
                    } else {
                        parsedDate = dayLower;
                    }
                }

                if (timeVal) {
                    const timeClean = timeVal.trim().toLowerCase();
                    const timeMatch = timeClean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
                    if (timeMatch) {
                        parsedHour = timeMatch[1];
                        parsedMin = timeMatch[2];
                        parsedPeriod = timeMatch[3];
                    }
                }

                const timestamp = parseDateTime(parsedDay, parsedDate, parsedHour, parsedMin, parsedPeriod, formatVal);

                if (sendVal) {
                    sendMessage(
                        channel.id,
                        { content: timestamp },
                        false,
                        MessageActions.getSendMessageOptionsForReply(PendingReplyStore.getPendingReply(channel.id))
                    ).then(() => {
                        FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId: channel.id });
                    });
                } else {
                    setTimeout(() => insertTextIntoChatInputBox(timestamp), 10);
                }
            }
        }
    ],

    start() {

        addChatBarButton("TimezoneRemapper", props => {
            if (!props.isMainChat) return null;
            return (
                <ChatBarButton
                    tooltip="Insert Timezone Timestamp"
                    onClick={() => openModal(modalProps => <RemapperModal {...modalProps} channelId={props.channel.id} />)}
                    buttonProps={{ "aria-haspopup": "dialog" }}
                >
                    <ClockIcon />
                </ChatBarButton>
            );
        }, ClockIcon);

        FluxDispatcher.subscribe("DRAFT_CHANGE", handleDraftChange);
    },

    stop() {

        removeChatBarButton("TimezoneRemapper");

        FluxDispatcher.unsubscribe("DRAFT_CHANGE", handleDraftChange);
    },

    onBeforeMessageSend(_, msg: MessageObject) {
        if (settings.store.enabled) {
            msg.content = remapTimezones(msg.content, settings.store.defaultFormat);
        }
    },

    onBeforeMessageEdit(_, __, msg: MessageObject) {
        if (settings.store.enabled) {
            msg.content = remapTimezones(msg.content, settings.store.defaultFormat);
        }
    }
});

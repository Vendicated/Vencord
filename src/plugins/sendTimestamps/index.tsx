/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import "./styles.css";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { FormSwitch } from "@components/FormSwitch";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { copyWithToast, getTheme, insertTextIntoChatInputBox, sendMessage, Theme } from "@utils/discord";
import { Margins } from "@utils/margins";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { RenderModalProps } from "@vencord/discord-types";
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
    useState
} from "@webpack/common";

const settings = definePluginSettings({
    replaceMessageContents: {
        description: "Replace timestamps in message contents (e.g. `12:00`)",
        type: OptionType.BOOLEAN,
        default: true,
    },
    replaceNaturalLanguage: {
        description: "Enable natural language timezone remapping (e.g. @3pm, @tomorrow)",
        type: OptionType.BOOLEAN,
        default: true,
    },
    defaultFormat: {
        description: "Default Discord timestamp display format",
        type: OptionType.SELECT,
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

function parseTime(time: string) {
    const cleanTime = time.slice(1, -1).replace(/(\d)(AM|PM)$/i, "$1 $2");

    let ms = new Date(`${new Date().toDateString()} ${cleanTime}`).getTime() / 1000;
    if (isNaN(ms)) return time;

    if (Date.now() / 1000 > ms) ms += 86400;

    return `<t:${Math.round(ms)}:t>`;
}

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

    return getUnixMarkdown(target, format);
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

const FormatsList = ["", "t", "T", "d", "D", "f", "F", "s", "S", "R"] as const;
type FormatType = typeof FormatsList[number];

const formatLabels: Record<FormatType, string> = {
    "": "Default Layout",
    t: "Short Time (e.g., 9:30 PM)",
    T: "Long Time (e.g., 9:30:12 PM)",
    d: "Short Date (e.g., 06/06/2026)",
    D: "Long Date (e.g., June 6, 2026)",
    f: "Short Date/Time (e.g., June 6, 2026 9:30 PM)",
    F: "Long Date/Time (e.g., Saturday, June 6, 2026 9:30 PM)",
    s: "Short Style 2",
    S: "Long Style 2",
    R: "Relative (e.g., in 2 hours)"
};

const cl = classNameFactory("vc-st-");

function PickerModal(props: RenderModalProps & { channelId?: string }) {
    const [value, setValue] = useState<string>("");
    const [naturalInput, setNaturalInput] = useState("");
    const [useNatural, setUseNatural] = useState(false);
    const [format, setFormat] = useState<FormatType>(settings.store.defaultFormat as FormatType);
    const [sendDirect, setSendDirect] = useState(false);

    const time = useMemo(() => {
        if (useNatural && naturalInput) {
            let parsedDay: string | undefined = undefined;
            let parsedDate: string | undefined = undefined;
            let parsedHour: string | undefined = undefined;
            let parsedMin: string | undefined = undefined;
            let parsedPeriod: string | undefined = undefined;

            const trimmed = naturalInput.trim().toLowerCase();

            const p1 = /^(tom+or+ow|to[- ]morrow|today)\b(?:\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?\b)?/i;
            const m1 = trimmed.match(p1);
            if (m1) {
                parsedDay = m1[1];
                parsedHour = m1[2];
                parsedMin = m1[3];
                parsedPeriod = m1[4];
            } else {
                const pTime = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i;
                const mTime = trimmed.match(pTime);
                if (mTime) {
                    parsedHour = mTime[1];
                    parsedMin = mTime[2];
                    parsedPeriod = mTime[3];
                } else {
                    parsedDate = trimmed;
                }
            }

            const ts = parseDateTime(parsedDay, parsedDate, parsedHour, parsedMin, parsedPeriod, format || "t");
            const match = ts.match(/<t:(\d+):/);
            if (match) {
                return parseInt(match[1], 10);
            }
        }
        return Math.round((new Date(value).getTime() || Date.now()) / 1000);
    }, [value, naturalInput, useNatural, format]);

    const formatTimestamp = (time: number, format: FormatType) => `<t:${time}${format && `:${format}`}>`;

    const [formatted, rendered] = useMemo(() => {
        const formatted = formatTimestamp(time, format);
        try {
            return [formatted, Parser.parse(formatted)];
        } catch {
            return [formatted, formatted];
        }
    }, [time, format]);

    const handleInsert = () => {
        if (!props.channelId) {
            insertTextIntoChatInputBox(formatted + " ");
            ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
            props.onClose();
            return;
        }

        if (sendDirect) {
            sendMessage(
                props.channelId,
                { content: formatted },
                false,
                MessageActions.getSendMessageOptionsForReply(PendingReplyStore.getPendingReply(props.channelId))
            ).then(() => {
                FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId: props.channelId });
            });
        } else {
            const draft = DraftStore.getDraft(props.channelId, DraftType.ChannelMessage) || "";
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
                                editor.insertText(formatted + " ");
                            } else {
                                insertTextIntoChatInputBox(formatted + " ");
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
                                insertTextIntoChatInputBox(formatted + " ");
                            }, 50);
                        } else {
                            insertTextIntoChatInputBox(formatted + " ");
                        }
                    }
                }, 10);
            } else {
                insertTextIntoChatInputBox(formatted + " ");
                ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
            }
        }
        props.onClose();
    };

    const handleCopy = () => {
        copyWithToast(formatted, "Copied timestamp to clipboard!");
        if (props.channelId) {
            const draft = DraftStore.getDraft(props.channelId, DraftType.ChannelMessage) || "";
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
        props.onClose();
    };

    return (
        <Modal
            {...props}
            title="Timestamp Picker"
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
                onClick: props.onClose
            }]}
        >
            <div className="vc-retime-modal-content">
                <div className="vc-retime-toggle-group">
                    <button
                        className={`vc-retime-toggle-btn ${!useNatural ? "active" : ""}`}
                        type="button"
                        onClick={() => setUseNatural(false)}
                    >
                        Date Picker
                    </button>
                    <button
                        className={`vc-retime-toggle-btn ${useNatural ? "active" : ""}`}
                        type="button"
                        onClick={() => setUseNatural(true)}
                    >
                        Natural Language
                    </button>
                </div>

                {!useNatural ? (
                    <div className="vc-retime-input-group">
                        <label>Select Date & Time</label>
                        <input
                            className={cl("date-picker")}
                            type="datetime-local"
                            value={value}
                            onChange={e => setValue(e.currentTarget.value)}
                            style={{
                                colorScheme: getTheme() === Theme.Light ? "light" : "dark",
                            }}
                        />
                    </div>
                ) : (
                    <div className="vc-retime-input-group">
                        <label>Natural Language Time</label>
                        <input
                            type="text"
                            placeholder="e.g. today 3pm, tomorrow, June 7, 2/2/2026"
                            className="vc-retime-input"
                            value={naturalInput}
                            onChange={e => setNaturalInput(e.currentTarget.value)}
                        />
                    </div>
                )}

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
                            renderOptionLabel={o => (
                                <div className={cl("format-label")}>
                                    {Parser.parse(formatTimestamp(time, o.value))}
                                </div>
                            )}
                            renderOptionValue={() => rendered}
                        />
                    </div>
                </div>

                <div className="vc-retime-preview-card">
                    <div className="vc-retime-preview-title">Live Preview</div>
                    <div className="vc-retime-preview-value">{rendered}</div>
                    <div className="vc-retime-preview-code">{formatted}</div>
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

const SendTimestampIcon: IconComponent = ({ height = 20, width = 20, className }) => {
    return (
        <svg
            viewBox="0 0 24 24"
            width={width}
            height={height}
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
};

const SendTimestampButton: ChatBarButtonFactory = ({ isAnyChat, channel }) => {
    if (!isAnyChat) return null;

    return (
        <ChatBarButton
            tooltip="Insert Timestamp"
            onClick={() => openModal(props => <PickerModal {...props} channelId={channel?.id} />)}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <SendTimestampIcon />
        </ChatBarButton>
    );
};

let lastTriggerDraft = "";

function handleDraftChange({ channelId, draft }: { channelId: string; draft: string }) {
    if (!settings.store.replaceNaturalLanguage) return;
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
            <PickerModal
                {...props}
                channelId={channelId}
            />
        ));
    }
}

export default definePlugin({
    name: "SendTimestamps",
    description: "Send timestamps easily via chat box button, text shortcuts, and autocomplete suggestions.",
    tags: ["Chat", "Commands"],
    authors: [Devs.Ven, Devs.Tyler, Devs.Grzesiek11, Devs.almostkoi],
    settings,

    chatBarButton: {
        icon: SendTimestampIcon,
        render: SendTimestampButton
    },

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
        if (!settings.store.replaceNaturalLanguage) return;
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
                                <PickerModal
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
        FluxDispatcher.subscribe("DRAFT_CHANGE", handleDraftChange);
    },

    stop() {
        FluxDispatcher.unsubscribe("DRAFT_CHANGE", handleDraftChange);
    },

    onBeforeMessageSend(_, msg) {
        if (settings.store.replaceMessageContents) {
            msg.content = msg.content.replace(/`\d{1,2}:\d{2} ?(?:AM|PM)?`/gi, parseTime);
        }
        if (settings.store.replaceNaturalLanguage) {
            msg.content = remapTimezones(msg.content, settings.store.defaultFormat);
        }
    },

    onBeforeMessageEdit(_, __, msg) {
        if (settings.store.replaceMessageContents) {
            msg.content = msg.content.replace(/`\d{1,2}:\d{2} ?(?:AM|PM)?`/gi, parseTime);
        }
        if (settings.store.replaceNaturalLanguage) {
            msg.content = remapTimezones(msg.content, settings.store.defaultFormat);
        }
    },

    settingsAboutComponent() {
        const samples = [
            "12:00",
            "3:51",
            "17:59",
            "24:00",
            "12:00 AM",
            "0:13PM"
        ].map(s => `\`${s}\``);

        return (
            <>
                <Forms.FormText>
                    To quickly send time only timestamps, include timestamps formatted as `HH:MM` (including the backticks!) in your message
                </Forms.FormText>
                <Forms.FormText>
                    See below for examples.
                    If you need anything more specific, use the Date button in the chat bar!
                </Forms.FormText>
                <Forms.FormText>
                    Examples:
                    <ul>
                        {samples.map(s => (
                            <li key={s}>
                                <code>{s}</code> {"->"} {Parser.parse(parseTime(s))}
                            </li>
                        ))}
                    </ul>
                </Forms.FormText>
            </>
        );
    },
});

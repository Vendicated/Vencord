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
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { getTheme, insertTextIntoChatInputBox, Theme } from "@utils/discord";
import { Margins } from "@utils/margins";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { Button, Forms, Parser, Select, useMemo, useState } from "@webpack/common";

const settings = definePluginSettings({
    replaceMessageContents: {
        description: "Replace timestamps in message contents",
        type: OptionType.BOOLEAN,
        default: true,
    },
});

function parseTime(time: string) {
    const cleanTime = time.slice(1, -1).replace(/(\d)(AM|PM)$/i, "$1 $2");

    let ms = new Date(`${new Date().toDateString()} ${cleanTime}`).getTime() / 1000;
    if (isNaN(ms)) return time;

    // add 24h if time is in the past
    if (Date.now() / 1000 > ms) ms += 86400;

    return `<t:${Math.round(ms)}:t>`;
}

const Formats = ["", "t", "T", "d", "D", "f", "F", "s", "S", "R"] as const;
type Format = typeof Formats[number];

const cl = classNameFactory("vc-st-");

function PickerModal({ rootProps, close }: { rootProps: ModalProps, close(): void; }) {
    const [value, setValue] = useState<string>();
    const [format, setFormat] = useState<Format>("");
    const time = Math.round((new Date(value!).getTime() || Date.now()) / 1000);

    const formatTimestamp = (time: number, format: Format) => `<t:${time}${format && `:${format}`}>`;

    const [formatted, rendered] = useMemo(() => {
        const formatted = formatTimestamp(time, format);
        return [formatted, Parser.parse(formatted)];
    }, [time, format]);

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2" className={cl("modal-title")}>
                    Timestamp Picker
                </Forms.FormTitle>

                <ModalCloseButton onClick={close} className={cl("modal-close-button")} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <input
                    className={cl("date-picker")}
                    type="datetime-local"
                    value={value}
                    onChange={e => setValue(e.currentTarget.value)}
                    style={{
                        colorScheme: getTheme() === Theme.Light ? "light" : "dark",
                    }}
                />

                <Forms.FormTitle>Timestamp Format</Forms.FormTitle>
                <div className={cl("format-select")}>
                    <Select
                        options={
                            Formats.map(m => ({
                                label: m,
                                value: m
                            }))
                        }
                        isSelected={v => v === format}
                        select={v => setFormat(v)}
                        serialize={v => v}
                        renderOptionLabel={o => (
                            <div className={cl("format-label")}>
                                {Parser.parse(formatTimestamp(time, o.value))}
                            </div>
                        )}
                        renderOptionValue={() => rendered}
                    />
                </div>

                <Forms.FormTitle className={Margins.bottom8}>Preview</Forms.FormTitle>
                <Forms.FormText className={cl("preview-text")}>
                    {rendered} ({formatted})
                </Forms.FormText>
            </ModalContent>

            <ModalFooter>
                <Button
                    onClick={() => {
                        insertTextIntoChatInputBox(formatted + " ");
                        close();
                    }}
                >Insert</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

const SendTimestampIcon: IconComponent = ({ height = 20, width = 20, className }) => {
    return (
        <svg
            aria-hidden="true"
            role="img"
            width={width}
            height={height}
            className={className}
            viewBox="0 0 24 24"
            style={{ scale: "1.2" }}
        >
            <g fill="none" fillRule="evenodd">
                <path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z" />
                <rect width="24" height="24" />
            </g>
        </svg>
    );
};

const SendTimestampButton: ChatBarButtonFactory = ({ isAnyChat }) => {
    if (!isAnyChat) return null;

    return (
        <ChatBarButton
            tooltip="Insert Timestamp"
            onClick={() => {
                const key = openModal(props => (
                    <PickerModal
                        rootProps={props}
                        close={() => closeModal(key)}
                    />
                ));
            }}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <SendTimestampIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "SendTimestamps",
    description: "Send timestamps easily via chat box button & text shortcuts. Read the extended description!",
    authors: [Devs.Ven, Devs.Tyler, Devs.Grzesiek11],
    settings,

    chatBarButton: {
        icon: SendTimestampIcon,
        render: SendTimestampButton
    },

    onBeforeMessageSend(_, msg) {
        if (settings.store.replaceMessageContents) {
            msg.content = msg.content.replace(/`\d{1,2}:\d{2} ?(?:AM|PM)?`/gi, parseTime);
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
                    To quickly send send time only timestamps, include timestamps formatted as `HH:MM` (including the backticks!) in your message
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

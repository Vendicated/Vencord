/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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
import { notify } from "./utils";

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { getTheme, Theme } from "@utils/discord";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Forms, useState } from "@webpack/common";

const uwu = classNameFactory("vc-r-");

function ReminderModal({ rootProps, close }: { rootProps: ModalProps, close(): void; }) {
    const [reminderTime, setReminderTime] = useState<string>("");
    const [reminderMessage, setReminderMessage] = useState<string>("");

    const handleSetReminder = () => {
        const timestamp = new Date(reminderTime).getTime();
        const timeDifference = timestamp - Date.now();

        if (timeDifference > 0) {
            setTimeout(() => {
                notify(reminderMessage);
            }, timeDifference);
        } else {
            console.error("Reminder time is in the past.");
        }

        close();
    };

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={uwu("modal-header")}>
                <Forms.FormTitle tag="h2">
                    Reminder
                </Forms.FormTitle>

                <ModalCloseButton onClick={close} />
            </ModalHeader>
                <ModalContent className={uwu("modal-content")}>
                <input
                    type="datetime-local"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    style={{
                        colorScheme: getTheme() === Theme.Light ? "light" : "dark",
                    }}
                />
                <input
                    type="text"
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                />
            </ModalContent>
            <ModalFooter>
                <Button onClick={handleSetReminder}>Set Reminder</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

const ChatBarIcon: ChatBarButton = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Set Reminder"
            onClick={() => {
                const key = openModal(props => (
                    <ReminderModal
                        rootProps={props}
                        close={() => closeModal(key)} />
                ));
            } }
            buttonProps={{ "aria-haspopup": "dialog" }}       >
            <svg
                aria-hidden="true"
                role="img"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                style={{ scale: "1.2" }}
            >
                <g fill="none" fill-rule="evenodd">
                    <path fill="currentColor" d="M22.007 3.282A3.21 3.21 0 0 0 19.293.7a3.37 3.37 0 0 0-2.539.7.35.35 0 0 0 .089.614 12.7 12.7 0 0 1 4.114 3.589.364.364 0 0 0 .614 0 2.92 2.92 0 0 0 .439-2.318M5.907 2.057a.39.39 0 0 0 .089-.614 3.07 3.07 0 0 0-2.539-.7A3.21 3.21 0 0 0 .743 3.282 3.23 3.23 0 0 0 1.225 5.6a.364.364 0 0 0 .614 0 11.55 11.55 0 0 1 4.068-3.543m5.468.789A9.625 9.625 0 0 0 1.75 12.47a9.47 9.47 0 0 0 1.882 5.689l-1.443 1.443a1.4 1.4 0 0 0 0 2.014 1.39 1.39 0 0 0 2.014 0l1.443-1.443a9.64 9.64 0 0 0 5.732 1.882 9.47 9.47 0 0 0 5.689-1.882l1.443 1.443a1.46 1.46 0 0 0 1.05.439 1.443 1.443 0 0 0 1.007-2.45l-1.443-1.443a9.47 9.47 0 0 0 1.882-5.689 9.625 9.625 0 0 0-9.625-9.625m-6.787 9.578a6.782 6.782 0 1 1 6.782 6.782 6.784 6.784 0 0 1-6.782-6.782m7.875-.393v-2.8a1.023 1.023 0 0 0-1.05-1.05 1.06 1.06 0 0 0-1.05 1.05v3.193a.89.89 0 0 0 .307.743l2.493 2.493a1.023 1.023 0 0 0 1.489 0 1.023 1.023 0 0 0 0-1.489Z" />
                    <rect width="24" height="24" />
                </g>
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "Reminders",
    description: "Make a reminder!",
    authors: [Devs.k_z],
    dependencies: ["CommandsAPI", "ChatInputButtonAPI"],

    start() {
        addChatBarButton("Reminder Plugin", ChatBarIcon);
    },

    stop() {
        removeChatBarButton("Reminder Plugin");
    },
});

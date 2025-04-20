/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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
import { addChatBarButton, ChatBarButton, ChatBarButtonFactory, removeChatBarButton } from "@api/ChatButtons";
import { sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { localStorage } from "@utils/localStorage";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Forms, SelectedChannelStore, TextInput, useState } from "@webpack/common";
import "./styles.css";

interface Reminder {
    message: string;
    timestamp: number;
    id: string;
    triggered: boolean;
}

// Global state management
let activeReminders: Reminder[] = [];
let globalCheckInterval: NodeJS.Timeout | null = null;

function ReminderForm(props: any) {
    const [message, setMessage] = useState("");
    const [time, setTime] = useState("");
    const [unit, setUnit] = useState("60");
    const [showHistory, setShowHistory] = useState(false);

    const handleSubmit = () => {
        if (!message.trim()) return;
        const timeValue = parseInt(time);
        if (isNaN(timeValue) || timeValue <= 0) return;

        setReminder(message, timeValue * parseInt(unit));
        props.onClose();
    };

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h3" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 22c-.825 0-1.413-.587-1.413-1.412h4c0 .825-.588 1.412-1.413 1.412H12Zm-9-3v-2h2V9c0-2.925 1.95-5.075 4.95-5.075 3.1 0 5.05 2.15 5.05 5.075v7h2v2H3Z" />
                    </svg>
                    Set Reminder
                </Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Reminder Message</Forms.FormTitle>
                <TextInput
                    value={message}
                    onChange={setMessage}
                    placeholder="What would you like to be reminded about?"
                />

                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    <div style={{ flex: 1 }}>
                        <Forms.FormTitle tag="h5">Time</Forms.FormTitle>
                        <TextInput
                            type="number"
                            value={time}
                            onChange={setTime}
                            placeholder="Time"
                            min="1"
                        />
                    </div>
                    <div style={{ width: "120px" }}>
                        <Forms.FormTitle tag="h5">Unit</Forms.FormTitle>
                        <select
                            value={unit}
                            onChange={e => setUnit(e.target.value)}
                            className="reminder-select"
                        >
                            <option value="60">Minutes</option>
                            <option value="1">Seconds</option>
                            <option value="3600">Hours</option>
                        </select>
                    </div>
                </div>
            </ModalContent>

            <ModalFooter>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={handleSubmit}
                >
                    Set Reminder
                </Button>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={() => setShowHistory(true)}
                    style={{ marginRight: "8px" }}
                >
                    History
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    onClick={props.onClose}
                >
                    Cancel
                </Button>
            </ModalFooter>

            {showHistory && <ReminderHistory {...props} onClose={() => setShowHistory(false)} />}
        </ModalRoot>
    );
}

function ReminderHistory(props: any) {
    const [activeTab, setActiveTab] = useState("expired");
    const [reminders, setReminders] = useState(activeReminders);
    const currentTime = Date.now();

    const filteredReminders = reminders.filter(reminder => {
        const isExpired = currentTime >= reminder.timestamp;
        return activeTab === "active" ? !isExpired : isExpired;
    });

    const handleDelete = (reminderId: string) => {
        activeReminders = activeReminders.filter(r => r.id !== reminderId);
        setReminders(activeReminders);
        saveRemindersToStorage();
    };

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h3" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 22c-.825 0-1.413-.587-1.413-1.412h4c0 .825-.588 1.412-1.413 1.412H12Zm-9-3v-2h2V9c0-2.925 1.95-5.075 4.95-5.075 3.1 0 5.05 2.15 5.05 5.075v7h2v2H3Z" />
                    </svg>
                    Reminder History
                </Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                    <Button
                        color={activeTab === "active" ? Button.Colors.BRAND : Button.Colors.TRANSPARENT}
                        onClick={() => setActiveTab("active")}
                        size={Button.Sizes.SMALL}
                    >
                        Active
                    </Button>
                    <Button
                        color={activeTab === "expired" ? Button.Colors.BRAND : Button.Colors.TRANSPARENT}
                        onClick={() => setActiveTab("expired")}
                        size={Button.Sizes.SMALL}
                    >
                        Expired
                    </Button>
                </div>

                <div className="reminder-history-list">
                    {filteredReminders.length === 0 ? (
                        <div className="reminder-history-empty">
                            No {activeTab} reminders found
                        </div>
                    ) : (
                        filteredReminders.map(reminder => {
                            const date = new Date(reminder.timestamp);
                            return (
                                <div key={reminder.id} className="reminder-history-item">
                                    <div className="reminder-history-item-content">
                                        <div>{reminder.message}</div>
                                        <div className="reminder-history-item-time">
                                            {date.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="reminder-history-item-status" style={{
                                        color: activeTab === "expired" ? "#ED4245" : "#2ecc71",
                                        background: activeTab === "expired" ? "rgba(237, 66, 69, 0.1)" : "rgba(46, 204, 113, 0.1)",
                                    }}>
                                        {activeTab === "expired" ? "EXPIRED" : "ACTIVE"}
                                    </div>
                                    <Button
                                        color={Button.Colors.RED}
                                        size={Button.Sizes.SMALL}
                                        onClick={() => handleDelete(reminder.id)}
                                    >
                                        ×
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </ModalContent>

            <ModalFooter>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    onClick={props.onClose}
                >
                    Close
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

/**
 * Checks all active reminders and triggers those that have reached their scheduled time
 */
function checkReminders() {
    const currentTime = Date.now();
    const channelId = SelectedChannelStore.getChannelId();

    if (!channelId) return;

    const remindersToTrigger = activeReminders.filter(reminder =>
        currentTime >= reminder.timestamp && !reminder.triggered
    );

    remindersToTrigger.forEach(reminder => {
        showMessage(reminder.message, "trigger", currentTime);
        reminder.triggered = true;
        saveRemindersToStorage();
    });
}

/**
 * Saves the current state of reminders to localStorage
 */
function saveRemindersToStorage() {
    const remindersToSave = activeReminders.map(reminder => ({
        message: reminder.message,
        timestamp: reminder.timestamp,
        id: reminder.id,
        triggered: reminder.triggered
    }));
    localStorage.setItem("equicord-reminders", JSON.stringify(remindersToSave));
}

/**
 * Loads saved reminders from localStorage
 */
function loadRemindersFromStorage() {
    const savedReminders = localStorage.getItem("equicord-reminders");
    if (savedReminders) {
        try {
            activeReminders = JSON.parse(savedReminders);
        } catch (e) {
            console.error("Failed to parse reminders:", e);
            activeReminders = [];
        }
    }
}

/**
 * Displays a reminder message in the chat
 */
function showMessage(message: string, type: "set" | "trigger" = "trigger", exprireAt?: any) {
    const channelId = SelectedChannelStore.getChannelId();
    if (!channelId) return;

    const emoji = type === "set" ? "⏰" : "🔔";

    const embed: any = {
        description: message,
        color: type === "set" ? 0x5865F2 : 0xED4245,
        title: type === "set" ? "⏰ Reminder Set ⏰" : "🔔 Reminder 🔔",
        footer: {
            text: type === "set" ? "Reminder will trigger" : "Reminder triggered"
        },
        timestamp: new Date(exprireAt).toISOString(),
    };

    sendBotMessage(channelId, {
        content: "",
        username: `${emoji} Reminder ${emoji}`,
        avatar_url: "",
        embeds: [embed]
    } as any);

    if (type === "trigger") {
        try {
            const audio = new Audio();
            audio.src = "https://discord.com/assets/dd920c06a01e5bb8b09678581e29d56f.mp3";
            audio.volume = 0.5;
            audio.play();
        } catch (e) {
            console.error("Could not play notification sound:", e);
        }
    }
}

/**
 * Creates a new reminder with the specified message and duration
 */
function setReminder(message: string, timeInSeconds: number) {
    const reminderTime = Date.now() + (timeInSeconds * 1000);
    const id = Math.random().toString(36).substr(2, 9);

    const reminder: Reminder = {
        message,
        timestamp: reminderTime,
        id,
        triggered: false
    };

    activeReminders.push(reminder);
    saveRemindersToStorage();
    showMessage(message, "set", reminderTime);
}

const ChatBarIcon: ChatBarButtonFactory = () => {
    const handleClick = () => {
        openModal(props => <ReminderForm {...props} />);
    };

    return (
        <ChatBarButton tooltip="Set Reminder" onClick={handleClick}>
            <svg width="25" height="25" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 22c-.825 0-1.413-.587-1.413-1.412h4c0 .825-.588 1.412-1.413 1.412H12Zm-9-3v-2h2V9c0-2.925 1.95-5.075 4.95-5.075 3.1 0 5.05 2.15 5.05 5.075v7h2v2H3Z" />
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "Message Reminder",
    description: "Set reminders with beautiful notifications",
    authors: [Devs.Diabelo, Devs.ItsAlex],
    start: () => {
        loadRemindersFromStorage();
        addChatBarButton("Reminder", ChatBarIcon);

        globalCheckInterval = setInterval(() => {
            checkReminders();
        }, 1000);

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                checkReminders();
            }
        });
    },
    stop: () => {
        removeChatBarButton("Reminder");
        if (globalCheckInterval) clearInterval(globalCheckInterval);
        activeReminders = [];
        localStorage.removeItem("equicord-reminders");
    }
});
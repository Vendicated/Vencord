/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

import { Settings } from "@api/Settings";
import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    openModal,
} from "@utils/modal";
import { Button, Forms, React, Select, TextArea, TextInput } from "@webpack/common";

import { isAutoWriteActive, startAutoWrite, stopAutoWrite } from "..";

function AutoWriteModal(props: ModalProps & { channel: any }) {
    const [messages, setMessages] = React.useState(Settings.plugins.AutoWrite.messages || "");
    const [cooldown, setCooldown] = React.useState((Settings.plugins.AutoWrite.cooldown || 1000).toString());
    const [mode, setMode] = React.useState(Settings.plugins.AutoWrite.mode || "sequential");
    const [isActive, setIsActive] = React.useState(isAutoWriteActive());

    const handleSave = () => {
        Settings.plugins.AutoWrite.messages = messages;
        Settings.plugins.AutoWrite.cooldown = parseInt(cooldown) || 1000;
        Settings.plugins.AutoWrite.mode = mode;
    };

    const handleStart = () => {
        handleSave();
        startAutoWrite(props.channel.id);
        setIsActive(true);
    };

    const handleStop = () => {
        stopAutoWrite();
        setIsActive(false);
        props.onClose();
    };

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Auto Write Settings</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Messages</Forms.FormTitle>
                <Forms.FormText style={{ marginBottom: "8px" }}>
                    Enter messages to send (one per line)
                </Forms.FormText>
                <TextArea
                    value={messages}
                    onChange={(e: string) => setMessages(e)}
                    placeholder="Message 1&#10;Message 2&#10;Message 3"
                    rows={8}
                />

                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Cooldown (milliseconds)</Forms.FormTitle>
                <Forms.FormText style={{ marginBottom: "8px" }}>
                    Time between each message
                </Forms.FormText>
                <TextInput
                    type="number"
                    value={cooldown}
                    onChange={(e: string) => setCooldown(e)}
                    placeholder="1000"
                />

                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Send Mode</Forms.FormTitle>
                <Forms.FormText style={{ marginBottom: "8px" }}>
                    Choose how messages should be sent
                </Forms.FormText>
                <Select
                    options={[
                        { label: "Sequential (Loop)", value: "sequential" },
                        { label: "Random", value: "random" },
                        { label: "Send All Once", value: "once" }
                    ]}
                    isSelected={(val: string) => val === mode}
                    select={(val: string) => setMode(val)}
                    serialize={(val: string) => val}
                />

                {isActive && (
                    <div style={{
                        marginTop: "16px",
                        padding: "12px",
                        backgroundColor: "var(--background-secondary-alt)",
                        borderRadius: "4px",
                        textAlign: "center",
                        color: "var(--text-positive)"
                    }}>
                        ✓ Auto Write is currently active
                    </div>
                )}
            </ModalContent>

            <ModalFooter>
                {isActive ? (
                    <Button
                        color={Button.Colors.RED}
                        onClick={handleStop}
                    >
                        Stop
                    </Button>
                ) : (
                    <Button
                        color={Button.Colors.GREEN}
                        disabled={!messages.trim()}
                        onClick={handleStart}
                    >
                        Start
                    </Button>
                )}
                <Button
                    color={Button.Colors.BRAND}
                    onClick={() => {
                        handleSave();
                        props.onClose();
                    }}
                    disabled={isActive}
                >
                    Save & Close
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    style={{ left: 15, position: "absolute" }}
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function buildAutoWriteModal(channel: any): any {
    openModal(props => <AutoWriteModal {...props} channel={channel} />);
}

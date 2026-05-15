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

import { BaseText } from "@components/BaseText";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Forms, useState } from "@webpack/common";

import { settings } from "./settings";
import { cl } from "./utils";

function UserKeyModal({ rootProps, userId, username }: { rootProps: ModalProps; userId: string; username: string; }) {
    const existingKey = settings.store.userKeys?.[userId] ?? "";
    const [key, setKey] = useState(existingKey);
    const [visible, setVisible] = useState(false);

    const save = () => {
        const trimmed = key.trim();
        if (!trimmed) return;
        settings.store.userKeys = { ...settings.store.userKeys, [userId]: trimmed };
        rootProps.onClose();
    };

    const clear = () => {
        const { [userId]: _, ...rest } = settings.store.userKeys ?? {};
        settings.store.userKeys = rest;
        rootProps.onClose();
    };

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <BaseText tag="h2" size="lg" weight="semibold" className={cl("modal-title")}>
                    AES Key — @{username}
                </BaseText>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <section className={Margins.bottom16}>
                    <Forms.FormTitle tag="h3">Per-User AES-256-GCM Secret Key</Forms.FormTitle>
                    <Forms.FormText className={Margins.bottom8}>
                        This key overrides the global secret when sending to or auto-decoding messages from <strong>@{username}</strong>.
                        Both users must enter the exact same key. Stored in plain text in your local Vencord settings.
                    </Forms.FormText>
                    <div className={cl("secret-row")}>
                        <input
                            type={visible ? "text" : "password"}
                            className={cl("secret-input")}
                            value={key}
                            onChange={e => setKey(e.currentTarget.value)}
                            onKeyDown={e => { if (e.key === "Enter") save(); }}
                            placeholder="Enter shared secret…"
                            autoComplete="off"
                            spellCheck={false}
                            autoFocus
                        />
                        <button
                            className={cl("secret-toggle")}
                            onClick={() => setVisible(v => !v)}
                            type="button"
                            aria-label={visible ? "Hide secret" : "Show secret"}
                        >
                            {visible ? "Hide" : "Show"}
                        </button>
                    </div>
                </section>

                <div className={cl("user-key-actions")}>
                    <button
                        className={cl("user-key-btn", "user-key-save")}
                        onClick={save}
                        disabled={!key.trim()}
                        type="button"
                    >
                        Save
                    </button>
                    {existingKey && (
                        <button
                            className={cl("user-key-btn", "user-key-clear")}
                            onClick={clear}
                            type="button"
                        >
                            Remove Key
                        </button>
                    )}
                    <button
                        className={cl("user-key-btn", "user-key-cancel")}
                        onClick={rootProps.onClose}
                        type="button"
                    >
                        Cancel
                    </button>
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

export function openUserKeyModal(userId: string, username: string) {
    openModal(props => <UserKeyModal rootProps={props} userId={userId} username={username} />);
}

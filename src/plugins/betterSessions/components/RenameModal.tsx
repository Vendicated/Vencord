/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SessionInfo } from "@plugins/betterSessions/types";
import { getDefaultName, savedSessionsCache, saveSessionsToDataStore } from "@plugins/betterSessions/utils";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Button, Forms, React, TextInput } from "@webpack/common";
import { KeyboardEvent } from "react";

export function RenameModal({ props, session, state }: { props: ModalProps, session: SessionInfo["session"], state: [string, React.Dispatch<React.SetStateAction<string>>]; }) {
    const [title, setTitle] = state;
    const [value, setValue] = React.useState(savedSessionsCache.get(session.id_hash)?.name ?? "");

    function onSaveClick() {
        savedSessionsCache.set(session.id_hash, { name: value, isNew: false });
        if (value !== "") {
            setTitle(`${value}*`);
        } else {
            setTitle(getDefaultName(session.client_info));
        }

        saveSessionsToDataStore();
        props.onClose();
    }

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Rename</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>New device name</Forms.FormTitle>
                <TextInput
                    style={{ marginBottom: "10px" }}
                    placeholder={getDefaultName(session.client_info)}
                    value={value}
                    onChange={setValue}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                            onSaveClick();
                        }
                    }}
                />
                <Button
                    style={{
                        marginBottom: "20px",
                        paddingLeft: "1px",
                        paddingRight: "1px",
                        opacity: 0.6
                    }}
                    look={Button.Looks.LINK}
                    color={Button.Colors.LINK}
                    size={Button.Sizes.NONE}
                    onClick={() => setValue("")}
                >
                    Reset Name
                </Button>
            </ModalContent>

            <ModalFooter>
                <div className="vc-betterSessions-footer-buttons">
                    <Button
                        color={Button.Colors.PRIMARY}
                        onClick={() => props.onClose()}
                    >
                        Cancel
                    </Button>
                    <Button
                        color={Button.Colors.BRAND}
                        onClick={onSaveClick}
                    >
                        Save
                    </Button>
                </div>
            </ModalFooter>
        </ModalRoot >
    );
}

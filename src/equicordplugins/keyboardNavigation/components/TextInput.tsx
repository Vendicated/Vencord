/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { closeAllModals, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, TextInput, useEffect, useState } from "@webpack/common";

interface SimpleTextInputProps {
    modalProps: ModalProps;
    onSelect: (inputValue: string) => void;
    placeholder?: string;
    info?: string;
}

export function SimpleTextInput({ modalProps, onSelect, placeholder, info }: SimpleTextInputProps) {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case "Enter":
                onSelect(inputValue);
                closeAllModals();
                break;
            default:
                break;
        }
    };

    useEffect(() => {
        setInputValue("");
    }, []);

    return (
        // @ts-ignore
        <ModalRoot className="vc-command-palette-simple-text" {...modalProps} size={ModalSize.DYNAMIC} onKeyDown={handleKeyDown}>
            <TextInput
                value={inputValue}
                onChange={e => setInputValue(e as unknown as string)}
                style={{ width: "30vw", borderRadius: "5px" }}
                placeholder={placeholder ?? "Type and press Enter"}
            />
            {info && <div className="vc-command-palette-textinfo">{info}</div>}
        </ModalRoot>
    );
}

export function openSimpleTextInput(placeholder?: string, info?: string): Promise<string> {
    return new Promise(resolve => {
        openModal(modalProps => (
            <SimpleTextInput
                modalProps={modalProps}
                onSelect={inputValue => resolve(inputValue)}
                placeholder={placeholder}
                info={info}
            />
        ));
    });
}

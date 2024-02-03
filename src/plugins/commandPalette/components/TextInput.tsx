import { classNameFactory } from "@api/Styles";
import { closeAllModals, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, TextInput, useState } from "@webpack/common";
import { useEffect } from "@webpack/common";

import "./styles.css";

interface SimpleTextInputProps {
    modalProps: ModalProps;
    onSelect: (inputValue: string) => void;
    placeholder?: string;
}

export function SimpleTextInput({ modalProps, onSelect, placeholder }: SimpleTextInputProps) {
    const cl = classNameFactory("vc-command-palette-");
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'Enter':
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
        <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
            <TextInput
                value={inputValue}
                onChange={(e) => setInputValue(e as unknown as string)}
                style={{ width: "405px", borderRadius: "1px" }}
                placeholder={placeholder ?? "Type and press Enter"}
            />
        </ModalRoot>
    );
}


export function openSimpleTextInput(placeholder?: string): Promise<string> {
    return new Promise((resolve) => {
        openModal((modalProps) => (
            <SimpleTextInput
                modalProps={modalProps}
                onSelect={(inputValue) => resolve(inputValue)}
                placeholder={placeholder}
            />
        ));
    });
}

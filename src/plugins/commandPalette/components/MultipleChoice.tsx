import { classNameFactory } from "@api/Styles";
import { Logger } from "@utils/Logger";
import { closeAllModals, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, TextInput, useState } from "@webpack/common";
import { useEffect } from "@webpack/common";
import { ButtonAction } from "../commands";

import "./styles.css";

interface MultipleChoiceProps {
    modalProps: ModalProps;
    onSelect: (selectedValue: any) => void;
    choices: ButtonAction[];
}

export function MultipleChoice({ modalProps, onSelect, choices }: MultipleChoiceProps) {
    const cl = classNameFactory("vc-command-palette-");
    const [queryEh, setQuery] = useState("");
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [startIndex, setStartIndex] = useState(0);

    const sortedActions = choices.slice().sort((a, b) => a.label.localeCompare(b.label));

    const filteredActions = sortedActions.filter(
        (action) => action.label.toLowerCase().includes(queryEh.toLowerCase())
    );


    const visibleActions = filteredActions.slice(startIndex, startIndex + 20);

    const totalActions = filteredActions.length;

    const handleButtonClick = (actionId: string, index: number) => {
        const selectedAction = filteredActions.find((action) => action.id === actionId);

        if (selectedAction) {
            onSelect(selectedAction);
        }

        closeAllModals();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const currentIndex = focusedIndex !== null ? focusedIndex : -1;
        let nextIndex;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                nextIndex = currentIndex > 0 ? currentIndex - 1 : visibleActions.length - 1;
                setFocusedIndex(nextIndex);

                if (currentIndex === 0 && totalActions > 20) {
                    setStartIndex((prev) => Math.max(prev - 1, 0));
                    setFocusedIndex(0);
                }

                break;
            case 'ArrowDown':
                e.preventDefault();
                nextIndex = currentIndex < visibleActions.length - 1 ? currentIndex + 1 : 0;
                setFocusedIndex(nextIndex);

                if (currentIndex === visibleActions.length - 1 && totalActions > 20) {
                    setStartIndex((prev) => Math.min(prev + 1, filteredActions.length - 20));
                    setFocusedIndex(19);
                }
                break;
            case 'Enter':
                if (currentIndex !== null && currentIndex >= 0 && currentIndex < visibleActions.length) {
                    handleButtonClick(visibleActions[currentIndex].id, currentIndex);
                }
                break;
            default:
                break;
        }
    };

    useEffect(() => {
        setFocusedIndex(0);
        setStartIndex(0);
    }, [queryEh]);

    return (
        <ModalRoot className={cl("root")} {...modalProps} size={ModalSize.MEDIUM}>
            <div>
                <TextInput
                    value={queryEh}
                    onChange={(e) => setQuery(e)}
                    style={{ width: "100%", borderRadius: "0" }}
                    placeholder="Search the Command Palette"
                />
                <div className={cl("option-container")}>
                    {visibleActions.map((action, index) => (
                        <button
                            key={action.id}
                            className={cl("option", { "key-hover": index === focusedIndex })}
                            onClick={() => handleButtonClick(action.id, index)}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>
        </ModalRoot>
    );
}

export function openMultipleChoice(choices: ButtonAction[]): Promise<ButtonAction> {
    return new Promise((resolve) => {
        openModal((modalProps) => (
            <MultipleChoice
                modalProps={modalProps}
                onSelect={(selectedValue) => {
                    closeAllModals();
                    resolve(selectedValue);
                }}
                choices={choices}
            />
        ));
    });
}

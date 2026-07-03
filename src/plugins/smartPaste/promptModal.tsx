/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Span } from "@components/index";
import type { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, React, Select } from "@webpack/common";

import { SmartPasteLanguage, SmartPasteLanguageLabels, SmartPasteLanguages } from "./settings";

export function openSmartPastePrompt(description: string, defaultLanguage: SmartPasteLanguage, onSelect: (choice: SmartPasteLanguage | null) => void) {
    openModal(modalProps => (
        <SmartPastePromptModal
            modalProps={modalProps}
            description={description}
            defaultLanguage={defaultLanguage}
            onSelect={onSelect}
        />
    ));
}

interface SmartPastePromptModalProps {
    modalProps: RenderModalProps;
    description: string;
    defaultLanguage: SmartPasteLanguage;
    onSelect(choice: SmartPasteLanguage | null): void;
}

function SmartPastePromptModal({ modalProps, description, defaultLanguage, onSelect }: SmartPastePromptModalProps) {
    const [language, setLanguage] = React.useState<SmartPasteLanguage>(defaultLanguage);
    const settled = React.useRef(false);
    const languageLabel = SmartPasteLanguageLabels[language];

    const resolve = (choice: SmartPasteLanguage | null) => {
        if (settled.current) return;
        settled.current = true;
        onSelect(choice);
        modalProps.onClose();
    };

    return (
        <Modal
            {...modalProps}
            title={`Smart Paste - Wrapping as ${languageLabel}`}
            subtitle={description}
            onClose={() => resolve(null)}
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: () => resolve(null)
                },
                {
                    text: `Insert as ${languageLabel}`,
                    variant: "primary",
                    onClick: () => resolve(language)
                }
            ]}
        >
            <Span className="vc-smart-paste-modal-text">
                <strong>Wrapping as:</strong> {languageLabel}
            </Span>

            <Select
                placeholder="Language"
                options={SmartPasteLanguages.map(item => ({
                    label: SmartPasteLanguageLabels[item],
                    value: item,
                    default: item === defaultLanguage
                }))}
                closeOnSelect={true}
                select={setLanguage}
                isSelected={value => value === language}
                serialize={String}
            />
        </Modal>
    );
}

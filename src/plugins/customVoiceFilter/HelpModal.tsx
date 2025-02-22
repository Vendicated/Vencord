/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Flex, Forms } from "@webpack/common";
import { JSX } from "react";

import { templateVoicepack, voices } from ".";
import { Markdown } from "./Markdown";
import { downloadFile } from "./utils";

export function openHelpModal(): string {
    const key = openModal(modalProps => (
        <HelpModal
            modalProps={modalProps}
            close={() => closeModal(key)}
        />
    ));
    return key;
}

interface HelpModalProps {
    modalProps: ModalProps;
    close: () => void;
}

function HelpModal({ modalProps, close }: HelpModalProps): JSX.Element {
    const description = `To build your own voicepack, you need to have a voicepack file. You can download one from the template or look at this tutorial.

The voicepack file is a json file that contains the voicepack data.
A voicepack may have one or multiple voices. Each voice is an object with the following properties:
\`\`\`json
${templateVoicepack}
\`\`\`*Style Key must be "" or one of the following: ${voices ? [...new Set(Object.values(voices).map(({ styleKey }) => styleKey))].join(", ") : ""}*

Once you have the voicepack file, you can use the <vf:main> to manage your voicepacks.`;

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Help with voicepacks
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent className="vc-voice-filters-modal">
                <Markdown content={description} />
            </ModalContent>
            <ModalFooter>
                <Flex style={{ gap: "0.5rem" }} justify={Flex.Justify.BETWEEN} align={Flex.Align.CENTER}>
                    <Button onClick={() => downloadFile("voicepack-template.json", templateVoicepack)} color={Button.Colors.BRAND_NEW}>
                        Download template file
                    </Button>
                    <Button onClick={close} color={Button.Colors.TRANSPARENT}>Close</Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}

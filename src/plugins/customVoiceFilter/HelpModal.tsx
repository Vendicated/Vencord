/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CodeBlock } from "@components/CodeBlock";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Flex, Forms, Text } from "@webpack/common";
import { JSX } from "react";

import { templateVoicepack } from ".";
import { downloadFile } from "./utils";
import { openVoiceFiltersModal } from "./VoiceFiltersModal";

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
    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Help with voicepacks
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ paddingBlock: "0.5rem" }}>
                <Flex style={{ gap: "1rem" }} direction={Flex.Direction.VERTICAL}>
                    <Text>To build your own voicepack, you need to have a voicepack file. You can download one from the template or look at this tutorial.</Text>
                    <Text>The voicepack file is a json file that contains the voicepack data. You can find the template <a onClick={() => {
                        downloadFile("voicepack-template.json", templateVoicepack);
                    }}>here</a></Text>
                    <Text>Once you have the voicepack file, you can use the <a onClick={openVoiceFiltersModal}>Voice Filters Management Menu</a> to manage your voicepacks.</Text>
                    <Text>A voicepack may have one or multiple voices. Each voice is an object with the following properties:</Text>
                    <CodeBlock lang="json" content={templateVoicepack} />
                    <Text style={{ fontStyle: "italic" }}>Style Key must be "" or one of the following: skye, quinn, axel, sebastien, megaphone, robot, tunes, ghost, spacebunny, justus, harper, villain, solara, cave, deepfried</Text>
                </Flex>
            </ModalContent>
            <ModalFooter>
                <Button onClick={close} color={Button.Colors.TRANSPARENT}>Close</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

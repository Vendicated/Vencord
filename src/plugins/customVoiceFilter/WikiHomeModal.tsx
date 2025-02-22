/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Card, Flex, Forms, Text, useState } from "@webpack/common";

import { ChevronIcon } from "./Icons";
import { Markdown } from "./Markdown";
import { cl } from "./utils";

interface Section {
    title: string;
    content: string;
}

const sections: Section[] = [
    {
        title: "How to install a voicepack",
        content: "To install a voicepack, you need to paste the voicepack url in the <vf:main>"
    },
    {
        title: "How to create a voicepack",
        content: `You have two methods to create a voicepack:
1. Use the <vf:createVoice> (recommended)
2. Use the <vf:help> (advanced)`
    },
    {
        title: "How does it work?",
        content: `Discord actually uses a Python project named [Retrieval-based Voice Conversion](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion) to convert your voice into the voice model you picked.
This voice cloning technology allows an audio input to be converted into a different voice, with a high degree of accuracy.
Actually, Discord uses ONNX files to run the model, for a better performance and less CPU usage.
![img](https://fox3000foxy.com/voicepacks/assets/working.png)`
    },
    {
        title: "How to create an ONNX from an existing RVC model?",
        content: `RVC models can be converted to ONNX files using the [W-Okada Software](https://github.com/w-okada/voice-changer/).
MMVCServerSio is software that is issued from W-Okada Software, and can be downloaded [here](https://huggingface.co/datasets/Derur/all-portable-ai-in-one-url/blob/main/HZ/MMVCServerSIO.7z).
Thats the actual software that does exports RVC models to ONNX files.
Just load your model inside MMVCServerSio, and click on "Export ONNX":
![img](https://fox3000foxy.com/voicepacks/assets/export-1.png)![img](https://fox3000foxy.com/voicepacks/assets/export-2.png)
Enjoy you now have a ONNX model file for your voicepack!`
    },
    {
        title: "How to train my own voice model?",
        content: "Refers to [this video](https://www.youtube.com/watch?v=tnfqIQ11Qek&ab_channel=AISearch) and convert it to ONNX."
    }
];

interface WikiHomeModalProps {
    modalProps: ModalProps;
    close: () => void;
    accept: () => void;
}

export function WikiHomeModal({ modalProps, close, accept }: WikiHomeModalProps) {
    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE} className="vc-voice-filters-wiki">
            <ModalHeader>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Wiki Home
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent className="vc-voice-filters-modal">
                <Flex style={{ gap: "0.5rem" }} direction={Flex.Direction.VERTICAL}>
                    <Text>Here are some tutorials and guides about the Custom Voice Filter Plugin:</Text>

                    {sections.map((section, index) => (
                        <CollapsibleCard key={index} title={section.title} content={section.content} />
                    ))}
                </Flex>
            </ModalContent>
            <ModalFooter>
                <Button onClick={close}>Close</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openWikiHomeModal(): string {
    const key = openModal(modalProps => (
        <WikiHomeModal
            modalProps={modalProps}
            close={() => closeModal(key)}
            accept={() => {
                // console.warn("accepted", url);
                closeModal(key);
            }}
        />
    ));
    return key;
}

interface CollapsibleCardProps {
    title: string;
    content: string;
}

function CollapsibleCard({ title, content }: CollapsibleCardProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Card className={cl("vc-voice-filters-card", isOpen && "vc-voice-filters-card-open")} style={{ background: "var(--background-secondary)" }}>
            <Card className="vc-voice-filters-card-title" onClick={() => setIsOpen(!isOpen)}>
                <Text variant="heading-md/semibold">{title}</Text>
                <ChevronIcon className="vc-voice-filters-card-icon" />
            </Card>
            <Markdown content={content} className="vc-voice-filters-details" />
        </Card >
    );
}


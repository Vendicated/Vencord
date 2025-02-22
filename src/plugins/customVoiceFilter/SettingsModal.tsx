/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Margins } from "@utils/margins";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Flex, Forms, Slider } from "@webpack/common";
import { JSX } from "react";

import plugin, { settings } from "./index";


export function openSettingsModal(): string {
    const key = openModal(modalProps => (
        <SettingsModal modalProps={modalProps} close={() => closeModal(key)} />
    ));
    return key;
}

interface SettingsModalProps {
    modalProps: ModalProps;
    close: () => void;
}


//  Create Voice Filter Modal
function SettingsModal({ modalProps, close }: SettingsModalProps): JSX.Element {
    const settingsState = settings.use();
    const { settings: { def } } = plugin;

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Settings
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent className="vc-voice-filters-modal">
                <Flex style={{ gap: "1rem" }} direction={Flex.Direction.VERTICAL}>
                    <Forms.FormSection>
                        <Forms.FormTitle>Pitch</Forms.FormTitle>
                        <Forms.FormText className={Margins.bottom20} type="description">{def.pitch.description}</Forms.FormText>
                        <Slider
                            markers={def.pitch.markers}
                            minValue={def.pitch.markers[0]}
                            maxValue={def.pitch.markers.at(-1)}
                            initialValue={settingsState.pitch ?? def.pitch.default}
                            onValueChange={value => settingsState.pitch = value}
                            onValueRender={value => `${value}`}
                            stickToMarkers={true}
                        />
                    </Forms.FormSection>
                    <Forms.FormSection>
                        <Forms.FormTitle>Frequency</Forms.FormTitle>
                        <Forms.FormText className={Margins.bottom20} type="description">{def.frequency.description}</Forms.FormText>
                        <Slider
                            markers={def.frequency.markers}
                            minValue={def.frequency.markers[0]}
                            maxValue={def.frequency.markers.at(-1)}
                            initialValue={settingsState.frequency ?? def.frequency.default}
                            onValueChange={value => settingsState.frequency = value}
                            onValueRender={value => `${value}Hz`}
                            stickToMarkers={true}
                        />
                    </Forms.FormSection>
                </Flex>
            </ModalContent>
            <ModalFooter>
                <Flex style={{ gap: "0.5rem" }} justify={Flex.Justify.END} align={Flex.Align.CENTER}>
                    <Button color={Button.Colors.GREEN} onClick={close} >Save & Exit</Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}

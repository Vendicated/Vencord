/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Flex, Forms, Select, TextInput, useCallback, useMemo, UserStore, useState } from "@webpack/common";
import { SelectOption } from "@webpack/types";
import { JSX } from "react";

import { voices } from ".";
import { openErrorModal } from "./ErrorModal";
import { IVoiceFilter, useVoiceFiltersStore } from "./index";
const requiredFields = ["name", "iconURL", "onnxFileUrl", "previewSoundURLs"] as const satisfies readonly (keyof IVoiceFilter)[];


export function openCreateVoiceModal(defaultValue?: Partial<IVoiceFilter>): string {
    const key = openModal(modalProps => (
        <CreateVoiceFilterModal modalProps={modalProps} close={() => closeModal(key)} defaultValue={defaultValue} />
    ));
    return key;
}

interface CreateVoiceFilterModalProps {
    modalProps: ModalProps;
    close: () => void;
    defaultValue?: Partial<IVoiceFilter>;
}


//  Create Voice Filter Modal
function CreateVoiceFilterModal({ modalProps, close, defaultValue }: CreateVoiceFilterModalProps): JSX.Element {
    const currentUser = useMemo(() => UserStore.getCurrentUser(), []);
    const [voiceFilter, setVoiceFilter] = useState(() => (
        { author: currentUser.id, name: "", iconURL: "", styleKey: "", onnxFileUrl: "", ...defaultValue }
    ));

    const update = useCallback(<K extends keyof IVoiceFilter>(value: IVoiceFilter[K], key: K) => {
        setVoiceFilter(prev => ({ ...prev, [key]: value }));
    }, []);
    const submit = useCallback(() => {
        if (requiredFields.every(field => voiceFilter[field])) {
            useVoiceFiltersStore.getState().downloadVoicepack(JSON.stringify({
                id: voiceFilter.author + "-" + voiceFilter.name.toLowerCase().replace(/ /g, "-"),
                available: true,
                temporarilyAvailable: false,
                custom: true,
                splashGradient: "radial-gradient(circle, #d9a5a2 0%, rgba(0,0,0,0) 100%)",
                baseColor: "#d9a5a2",
                ...voiceFilter
            } satisfies IVoiceFilter));
            close();
        } else {
            openErrorModal("Please fill in all required fields");
        }
    }, [voiceFilter]);

    const keyOptions: SelectOption[] = useMemo(() =>
        [{ value: "", label: "(empty)" }, ...(voices ? Object.keys(voices).map(name => ({ value: name, label: name })) : [])],
        []);

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    {voiceFilter.id ? "Edit a voice filter" : "Create a voice filter"}
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent className="vc-voice-filters-modal">
                <Flex style={{ gap: "1rem" }} direction={Flex.Direction.VERTICAL}>
                    <Forms.FormSection>
                        <Forms.FormTitle>Name<span style={{ color: "var(--text-danger)" }}>*</span></Forms.FormTitle>
                        <TextInput placeholder="Model" onChange={update} style={{ width: "100%" }} value={voiceFilter.name} name="name" required />
                    </Forms.FormSection>
                    <Forms.FormSection>
                        <Forms.FormTitle>Icon URL<span style={{ color: "var(--text-danger)" }}>*</span></Forms.FormTitle>
                        <TextInput placeholder="https://example.com/voicepacks/model/icon.png" onChange={update} style={{ width: "100%" }} value={voiceFilter.iconURL} name="iconURL" required />
                    </Forms.FormSection>
                    <Forms.FormSection>
                        <Forms.FormTitle>Style Key</Forms.FormTitle>
                        <Select
                            options={keyOptions}
                            placeholder={"Select an option"}
                            maxVisibleItems={5}
                            closeOnSelect={true}
                            select={value => update(value, "styleKey")}
                            isSelected={v => v === voiceFilter.styleKey}
                            serialize={String}
                        />
                    </Forms.FormSection>
                    <Forms.FormSection>
                        <Forms.FormTitle>ONNX File URL<span style={{ color: "var(--text-danger)" }}>*</span></Forms.FormTitle>
                        <TextInput placeholder="https://example.com/voicepacks/model/model.onnx" onChange={update} style={{ width: "100%" }} value={voiceFilter.onnxFileUrl} name="onnxFileUrl" required />
                    </Forms.FormSection>
                    <Forms.FormSection>
                        <Forms.FormTitle>Preview Sound URL<span style={{ color: "var(--text-danger)" }}>*</span></Forms.FormTitle>
                        <TextInput placeholder="https://example.com/voicepacks/model/preview.mp3" onChange={value => update(value ? [value] : undefined, "previewSoundURLs")} style={{ width: "100%" }} value={voiceFilter.previewSoundURLs?.[0] ?? ""} required />
                    </Forms.FormSection>
                </Flex>
            </ModalContent>
            <ModalFooter>
                <Flex style={{ gap: "0.5rem" }} justify={Flex.Justify.END} align={Flex.Align.CENTER}>
                    <Button color={Button.Colors.TRANSPARENT} onClick={close} >Cancel</Button>
                    <Button color={Button.Colors.GREEN} onClick={submit}>{voiceFilter.id ? "Save" : "Create"}</Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}

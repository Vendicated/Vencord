/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Flex, Forms, Select, TextInput, useCallback, useMemo, UserStore, useState } from "@webpack/common";
import { SelectOption } from "@webpack/types";

import { voices } from ".";
import ErrorModal from "./ErrorModal";
import HelpModal from "./HelpModal";
import { IVoiceFilter, useVoiceFiltersStore } from "./index";
import { modal } from "./utils";
const requiredFields = ["name", "iconURL", "onnxFileUrl", "previewSoundURLs"] as const satisfies readonly (keyof IVoiceFilter)[];

interface CreateVoiceFilterModalProps {
    defaultValue?: Partial<IVoiceFilter>;
}

//  Create Voice Filter Modal
export default modal<CreateVoiceFilterModalProps, "cancel">(function CreateVoiceFilterModal({ modalProps, close, defaultValue }) {
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
            ErrorModal.open({ message: "Please fill in all required fields" });
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
                        <TextInput
                            placeholder="https://example.com/voicepacks/model/icon.png"
                            onChange={update}
                            style={{ width: "100%" }}
                            value={voiceFilter.iconURL}
                            name="iconURL"
                            required
                        />
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
                        <TextInput
                            placeholder="https://example.com/voicepacks/model/model.onnx"
                            onChange={update}
                            style={{ width: "100%" }}
                            value={voiceFilter.onnxFileUrl}
                            name="onnxFileUrl"
                            required
                        />
                    </Forms.FormSection>
                    <Forms.FormSection>
                        <Forms.FormTitle>Preview Sound URL<span style={{ color: "var(--text-danger)" }}>*</span></Forms.FormTitle>
                        <TextInput
                            placeholder="https://example.com/voicepacks/model/preview.mp3"
                            onChange={update}
                            style={{ width: "100%" }}
                            value={voiceFilter.previewSoundURLs?.[0] ?? ""}
                            required
                        />
                    </Forms.FormSection>
                </Flex>
            </ModalContent>
            <ModalFooter>
                <Flex style={{ gap: "0.5rem" }} justify={Flex.Justify.END} align={Flex.Align.CENTER}>
                    <Button color={Button.Colors.TRANSPARENT} onClick={() => HelpModal.open()}>How to create a voicepack?</Button>
                    <Button color={Button.Colors.GREEN} onClick={submit}>{voiceFilter.id ? "Save" : "Create"}</Button>
                    <Button color={Button.Colors.TRANSPARENT} onClick={() => close("cancel")} >Cancel</Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
});

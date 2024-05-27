/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { debounce } from "@shared/debounce";
import { findComponentByCodeLazy } from "@webpack";
import { Forms, React, TextInput } from "@webpack/common";

import { canvasStateType } from "../../MainBoard";

type CanvasSettingsProps = {
    currentState: canvasStateType,
    setGlobal: React.Dispatch<React.SetStateAction<canvasStateType>>;
} & React.HTMLProps<React.ReactElement>;

interface ColorPickerProps {
    color: number | null;
    showEyeDropper?: boolean;
    suggestedColors?: string[];
    onChange(value: number | null): void;
}

const ColorPicker = findComponentByCodeLazy<ColorPickerProps>(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)");

const CanvasSettings = (props: CanvasSettingsProps) => {
    const { setGlobal, currentState } = props;

    return (
        <div className="excali-config-frame">
            <Forms.FormSection>
                <Forms.FormTitle tag="h3">Canvas</Forms.FormTitle>
                <Forms.FormDivider />
                <Forms.FormSection>
                    <Forms.FormTitle tag="h3">Size</Forms.FormTitle>
                    <Flex flexDirection="row" style={{ gap: 5 }}>
                        <Flex flexDirection="column" style={{ width: "50%", gap: 5 }}>
                            <Forms.FormText variant="text-md/bold">Width</Forms.FormText>
                            <TextInput key={"Width"} type="number" defaultValue={currentState.width} width={16} placeholder="Width" onChange={e => { setGlobal({ ...currentState, width: frameSize(e) }); }} max={4096} />
                        </Flex>
                        <Flex flexDirection="column" style={{ width: "50%", gap: 5 }}>
                            <Forms.FormText variant="text-md/bold">Height</Forms.FormText>
                            <TextInput height={"Height"} type="number" defaultValue={currentState.height} width={16} placeholder="Height" onChange={e => { setGlobal({ ...currentState, height: frameSize(e) }); }} max={4096} />
                        </Flex>
                    </Flex>
                </Forms.FormSection>
                <Forms.FormSection>
                    <Forms.FormTitle tag="h3">Background</Forms.FormTitle>
                    <ColorPicker color={currentState.fill?.color ?? 16777215} onChange={debounce((e: number) => { setGlobal({ ...currentState, fill: { color: e, shouldFill: true } }); }, 350)} />
                </Forms.FormSection>
            </Forms.FormSection>
        </div>
    );
};

const frameSize = (n: string): number => {
    return Math.min(Math.max(parseInt(n), 25), 4096);
};



export default CanvasSettings;

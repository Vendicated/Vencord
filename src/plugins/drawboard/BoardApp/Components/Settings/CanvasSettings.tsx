/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { findComponentByCodeLazy } from "@webpack";
import { Forms, React, Switch, Text, TextInput } from "@webpack/common";

import { canvasStateType } from "../../MainBoard";

type CanvasSettingsProps = {
    currentState: canvasStateType,
    setCanvas: React.Dispatch<React.SetStateAction<canvasStateType>>;
} & React.HTMLProps<React.ReactElement>;

interface ColorPickerProps {
    color: number | null;
    showEyeDropper?: boolean;
    suggestedColors?: string[];
    onChange(value: number | null): void;
    onClose(): void;
    disabled?: boolean;
}

interface ColorPickerWithSwatchesProps {
    defaultColor: number;
    colors: number[];
    value: number;
    disabled?: boolean;
    onChange(value: number | null): void;
    renderDefaultButton?: () => React.ReactNode;
    renderCustomButton?: () => React.ReactNode;
}

const ColorPicker = findComponentByCodeLazy<ColorPickerProps>(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)");
const ColorPickerWithSwatches = findComponentByCodeLazy<ColorPickerWithSwatchesProps>("presets,", "customColor:");


const CanvasSettings = (props: CanvasSettingsProps) => {
    const { setCanvas, currentState } = props;
    const [changedColor, setChangedColor] = React.useState<number>(currentState.fill?.color ?? 16777215);

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
                            <TextInput key={"Width"} type="number" defaultValue={currentState.width} width={16} placeholder="Width" onChange={e => { setCanvas({ ...currentState, width: frameSize(e) }); }} max={4096} />
                        </Flex>
                        <Flex flexDirection="column" style={{ width: "50%", gap: 5 }}>
                            <Forms.FormText variant="text-md/bold">Height</Forms.FormText>
                            <TextInput height={"Height"} type="number" defaultValue={currentState.height} width={16} placeholder="Height" onChange={e => { setCanvas({ ...currentState, height: frameSize(e) }); }} max={4096} />
                        </Flex>
                    </Flex>
                </Forms.FormSection>
                <Forms.FormSection>
                    <Forms.FormTitle tag="h3">Background</Forms.FormTitle>
                    <Flex flexDirection="column" style={{ gap: 0 }}>
                        <Switch onChange={e => setCanvas({ ...currentState, fill: { color: currentState.fill?.color ?? 16777215, shouldFill: e } })} value={currentState.fill?.shouldFill ?? true} note={"When disabled the background color is not set, and is transparent on the processed image."} tooltipNote={`${currentState.fill?.shouldFill ? "Disable" : "Enable"} background color`} hideBorder={true}>
                            <Text>Enable</Text>
                        </Switch>
                        <ColorPicker color={changedColor} onChange={e => setChangedColor(e ?? 16777215)} onClose={() => setCanvas({ ...currentState, fill: { color: changedColor, shouldFill: currentState.fill?.shouldFill ?? true } })} disabled={!currentState.fill?.shouldFill} />
                    </Flex>
                </Forms.FormSection>
            </Forms.FormSection>
        </div>
    );
};

const frameSize = (n: string): number => {
    return Math.min(Math.max(parseInt(n), 25), 4096);
};

export default CanvasSettings;

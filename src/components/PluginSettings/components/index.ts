/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DefinedSettings, PluginOptionBase } from "@utils/types";

export interface ISettingElementProps<T extends PluginOptionBase> {
    option: T;
    onChange(newValue: any): void;
    pluginSettings: {
        [setting: string]: any;
        enabled: boolean;
    };
    id: string;
    onError(hasError: boolean): void;
    definedSettings?: DefinedSettings;
}

export * from "../../Badge";
export * from "./SettingBooleanComponent";
export * from "./SettingCustomComponent";
export * from "./SettingNumericComponent";
export * from "./SettingSelectComponent";
export * from "./SettingSliderComponent";
export * from "./SettingTextComponent";


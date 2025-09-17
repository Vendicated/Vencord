/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { DefinedSettings, PluginOptionBase } from "@utils/types";

interface ISettingElementPropsBase<T> {
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

export type ISettingElementProps<T extends PluginOptionBase> = ISettingElementPropsBase<T>;
export type ISettingCustomElementProps<T extends Omit<PluginOptionBase, "description" | "placeholder">> = ISettingElementPropsBase<T>;

export * from "../../Badge";
export * from "./SettingBooleanComponent";
export * from "./SettingCustomComponent";
export * from "./SettingNumericComponent";
export * from "./SettingSelectComponent";
export * from "./SettingSliderComponent";
export * from "./SettingTextComponent";


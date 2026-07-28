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

import "./styles.css";

import { OptionType } from "@utils/types";
import { ComponentType } from "react";

import { BooleanSetting } from "./BooleanSetting";
import { ComponentSettingProps, SettingProps } from "./Common";
import { ComponentSetting } from "./ComponentSetting";
import { NumberSetting } from "./NumberSetting";
import { SelectSetting } from "./SelectSetting";
import { SliderSetting } from "./SliderSetting";
import { TextSetting } from "./TextSetting";

export const OptionComponentMap: Record<OptionType, ComponentType<SettingProps<any> | ComponentSettingProps<any>>> = {
    [OptionType.STRING]: TextSetting,
    [OptionType.NUMBER]: NumberSetting,
    [OptionType.BIGINT]: NumberSetting,
    [OptionType.BOOLEAN]: BooleanSetting,
    [OptionType.SELECT]: SelectSetting,
    [OptionType.SLIDER]: SliderSetting,
    [OptionType.COMPONENT]: ComponentSetting,
    [OptionType.CUSTOM]: () => null,
};

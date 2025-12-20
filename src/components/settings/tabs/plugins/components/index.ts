/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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

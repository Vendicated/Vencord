/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginOptionComponent } from "@utils/types";

import { ComponentSettingProps } from "./Common";

export function ComponentSetting({ option, onChange }: ComponentSettingProps<PluginOptionComponent>) {
    return option.component({ setValue: onChange, option });
}

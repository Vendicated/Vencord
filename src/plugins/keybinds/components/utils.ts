/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { findComponentByCodeLazy } from "@webpack";

export const cl = classNameFactory("vc-keybinds-");
export const CheckboxRow = findComponentByCodeLazy(".labelReversed");



/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CSSHex } from "../types";

export const hex2number = (hex: CSSHex): number => parseInt(hex.slice(1), 16);

export const number2hex = (num: number): CSSHex => `#${num.toString(16).padStart(6, "0")}`;

/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { findStoreLazy } from "@webpack";

export const MediaEngineStore = findStoreLazy("MediaEngineStore");
export const cl = classNameFactory("vc-vmsg-");

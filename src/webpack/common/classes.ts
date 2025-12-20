/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as t from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";

export const ButtonWrapperClasses: t.ButtonWrapperClasses = findByPropsLazy("buttonWrapper", "buttonContent");

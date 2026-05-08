/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as t from "@vencord/discord-types";
import { findExportedComponentLazy } from "@webpack";

export const Modal: t.Modal = findExportedComponentLazy("Modal");
export const ConfirmModal: t.ConfirmModal = findExportedComponentLazy("ConfirmModal");

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";

import * as t from "./types/classes";

export const ModalImageClasses: t.ImageModalClasses = findByPropsLazy("image", "modal");
export const ButtonWrapperClasses: t.ButtonWrapperClasses = findByPropsLazy("buttonWrapper", "buttonContent");

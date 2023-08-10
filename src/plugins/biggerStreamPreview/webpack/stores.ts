/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findStoreLazy } from "@webpack";

import * as t from "./types/stores";

export const ApplicationStreamPreviewStore: t.ApplicationStreamPreviewStore = findStoreLazy("ApplicationStreamPreviewStore");
export const ApplicationStreamingStore: t.ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByProps } from "@webpack";

import extractAndRequireModuleId from "./extractAndRequireModuleId";
export default async () => extractAndRequireModuleId(findByProps("openAvatarDecorationModal").openAvatarDecorationModal);


/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCode } from "@webpack";

import extractAndRequireModuleIds from "./extractAndRequireModuleIds";

export default async () => extractAndRequireModuleIds(findByCode("isTryItOutFlow;"));


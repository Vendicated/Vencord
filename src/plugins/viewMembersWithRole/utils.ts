/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { findByPropsLazy } from "@webpack";

export const cl = classNameFactory("vc-vmwr-");
export const GuildUtils = findByPropsLazy("requestMembersById");

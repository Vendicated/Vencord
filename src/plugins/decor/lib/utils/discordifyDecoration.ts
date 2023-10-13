/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Decoration } from "../api";
import { SKU_ID } from "../constants";
import decorationToString from "./decorationToString";

export default (d: Decoration) => ({ asset: decorationToString(d), skuId: SKU_ID });

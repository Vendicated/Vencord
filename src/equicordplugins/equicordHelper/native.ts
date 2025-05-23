/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CspPolicies, MediaScriptsAndCssSrc } from "@main/csp";

CspPolicies["*"] = MediaScriptsAndCssSrc;

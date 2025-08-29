/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CspPolicies } from "@main/csp";

CspPolicies["api.streamelements.com"] = ["connect-src", "media-src"];
CspPolicies["tiktok-tts.weilnet.workers.dev"] = ["connect-src", "media-src"];

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ConnectSrc, CspPolicies, ImageSrc } from "@main/csp";

// Whitelist SimplyPlural API domains for images and websocket connections
CspPolicies["api.apparyllis.com"] = ImageSrc; // For images
CspPolicies["wss://api.apparyllis.com"] = ConnectSrc; // For status updates (WebSocket)


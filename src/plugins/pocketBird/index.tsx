/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Idrees
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";

import { Birb } from "./birb.js";

export default definePlugin({
	name: "Pocket Bird",
	description: "Add a tiny pet bird to your Discord client!",
	authors: [Devs.Idrees],
	startAt: StartAt.DOMContentLoaded,
	start() {
		Birb();
	}
});

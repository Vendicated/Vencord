/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


// This plugin is just used to mark that discord components should have their displayName set
export default definePlugin({
    name: "ComponentDemangler",
    description: "Adds known component names to discords components. Can be seen in the component tree and in react component error stacks",
    authors: [Devs.sadan],

    requiresRestart: true,
});

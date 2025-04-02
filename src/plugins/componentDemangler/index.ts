/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "ComponentDemangler",
    description: "Adds known component names to discords components. Can be seen in the component tree and in react component stacks",
    authors: [Devs.sadan],
});

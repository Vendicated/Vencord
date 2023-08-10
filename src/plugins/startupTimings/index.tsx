/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/react";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "StartupTimings",
    description: "Adds Startup Timings to the Settings menu",
    authors: [Devs.Megu],
    patches: [{
        find: "PAYMENT_FLOW_MODAL_TEST_PAGE,",
        replacement: {
            match: /{section:.{1,2}\..{1,3}\.PAYMENT_FLOW_MODAL_TEST_PAGE/,
            replace: '{section:"StartupTimings",label:"Startup Timings",element:$self.StartupTimingPage},$&'
        }
    }],
    StartupTimingPage: LazyComponent(() => require("./StartupTimingPage").default)
});

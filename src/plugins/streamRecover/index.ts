/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const VIDEO_GUARD_EXPERIMENT = "2026-08-video-guard";

function dispatchExperimentOverride(variantId: number) {
    FluxDispatcher.dispatch({
        type: "APEX_EXPERIMENT_OVERRIDE_CREATE",
        experimentName: VIDEO_GUARD_EXPERIMENT,
        variantId
    });
}

export default definePlugin({
    name: "StreamRecover",
    description: "Re-enable the Go Live / Screen Share button blocked in Brazil by ANPD",
    authors: [Devs.Kalebinhoo],

    patches: [
        {
            find: "Object.defineProperties(this,{isDeveloper",
            replacement: {
                match: /(?<={isDeveloper:\{[^}]+?,get:\(\)=>)\i/,
                replace: "true"
            }
        },
        {
            find: 'type:"user",revision',
            replacement: {
                match: /!(\i)(?=&&"CONNECTION_OPEN")/,
                replace: "!($1=true)"
            }
        },
        {
            find: "}getServerAssignment(",
            replacement: {
                match: /}getServerAssignment\((\i),\i,\i\){/,
                replace: "$&if($1==null)return;"
            }
        }
    ],

    start() {
        dispatchExperimentOverride(-1);
    },

    stop() {
        dispatchExperimentOverride(0);
    }
});

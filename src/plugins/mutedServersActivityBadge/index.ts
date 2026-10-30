/*
* Vencord, a Discord client mod
* Copyright (c) 2026 NiNoX
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
  name: "MutedServersActivityBadge",
  description: "Keeps the servers activity badge visible even when server is muted.",
  authors: [Devs.NiNoX],
  tags: ["Servers", "Appearance", "Activity", "Voice"],

  patches: [
    {
      find: "GuildMediaStateStore",
      replacement: [
        {
          // Remove the early return for muted, non-selected guilds.
          match: /if\(!\i&&\i\)return \i;/,
          replace: ""
        },
      ]
    }
  ]
});
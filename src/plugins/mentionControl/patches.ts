/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { canonicalizeMatch } from "@utils/patches";
import { Patch, PatchReplacement, ReplaceFn } from "@utils/types";

import { AUDITED_BUILD } from "./compatibility";

function exactlyOne(match: RegExp, replace: ReplaceFn): PatchReplacement {
    const canonical = canonicalizeMatch(match);
    return {
        match,
        replace: (matched, ...groups) => {
            const source = groups.at(-1);
            if (typeof source !== "string" || [...source.matchAll(new RegExp(canonical.source, "g"))].length !== 1)
                return matched;
            return replace(matched, ...groups);
        }
    };
}

export const patches: Omit<Patch, "plugin">[] = [{
    find: /"NotificationStore"[\s\S]*?MESSAGE_CREATE:function[\s\S]*?getNotifyMessagesInSelectedChannel/,
    fromBuild: AUDITED_BUILD,
    toBuild: AUDITED_BUILD,
    group: true,
    replacement: [
        exactlyOne(
            /(let (\i)=)(\(0,(\i)\.\i\)\((\i),(\i),!\i\)),(?=(\i)=\i\.\i\.getNotifyMessagesInSelectedChannel\(\)&&\(0,\4\.\i\)\(\5,\6\);if\(!\2&&!\7\)return!1)/,
            (_matched, prefix, _normal, nativeExpression, _native, message) =>
                `${prefix}${nativeExpression}&&!$self.shouldSuppress(${message}),`
        ),
        exactlyOne(
            /((\i)=\i\.\i\.getNotifyMessagesInSelectedChannel\(\)&&)(\(0,\i\.\i\)\((\i),\i\))(?=;if\(!\i&&!\2\)return!1)/,
            (_matched, prefix, _selected, nativeExpression, message) =>
                `${prefix}${nativeExpression}&&!$self.shouldSuppress(${message})`
        ),
        exactlyOne(/\}$/, (matched, ...groups) => {
            const source = groups.at(-1);
            if (typeof source !== "string") return matched;
            const factory = source.match(/^0,function\(([A-Za-z_$][\w$]*),[A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*\)\{/);
            if (!factory) return matched;
            // A failed factory can be retried by Vencord without patches; it must not leave a ready binding.
            return `;$self.markReady(${factory[1]}.id,${factory[1]});${matched}`;
        })
    ]
}];

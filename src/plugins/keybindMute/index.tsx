/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import _ from "lodash";

export default definePlugin({
    name: "KeybindMute",
    description: "Adds on/off keybinds for muting and deafening",
    authors: [Devs.ella],
    patches: [
        {
            find: '.UNASSIGNED="UNASSIGNED",',
            replacement: {
                match: /(\s*e\.UNASSIGNED\s*=\s*"UNASSIGNED",)/,
                replace: (_, rest) => `${rest}
                    e.SET_MUTED="SET_MUTED",
                    e.SET_DEAFENED="SET_DEAFENED",
                    e.SET_UNMUTED="SET_UNMUTED",
                    e.SET_UNDEAFENED="SET_UNDEAFENED",`
            }
        },
        {
            find: 'keybindActionTypes()',
            replacement: {
                match: /(label:\s*R.NW.string\(R.t.NvGq1N\)[\s\S]*?},)/,
                replace: (_, rest) => {
                    const keybinds = [
                        "{value:A.kg4.SET_MUTED,label:R.NW.string(R.t['Fx/4wc'])}",
                        "{value:A.kg4.SET_DEAFENED,label:R.NW.string(R.t['wjcRFR'])}",
                        "{value:A.kg4.SET_UNMUTED,label:R.NW.string(R.t['QbFzMz'])}",
                        "{value:A.kg4.SET_UNDEAFENED,label:R.NW.string(R.t['XiejaG'])}"
                    ].join(",");

                    return `${rest} ${keybinds},`;
                }
            }
        },
        {
            find: "[S.kg4.UNASSIGNED]:{onTrigger(){},keyEvents:{}},",
            replacement: {
                match: /(\[S\.kg4\.UNASSIGNED\]:\{onTrigger\(\)\{\},keyEvents:\{\}\},)/,
                replace: (_, rest) => `${rest}
                    [S.kg4.SET_MUTED]: {
                        onTrigger: () => {
                            i.Z.setSelfMuteBool(true);
                        },
                        keyEvents: {
                            keyup: !0,
                            keydown: !1
                        }
                    },
                    [S.kg4.SET_DEAFENED]: {
                        onTrigger: () => {
                            i.Z.setSelfDeafBool(true);
                            i.Z.setSelfMuteBool(true); // Discord does this by default
                        },
                        keyEvents: {
                            keyup: !0,
                            keydown: !1
                        }
                    },
                    [S.kg4.SET_UNMUTED]: {
                        onTrigger: () => {
                            i.Z.setSelfMuteBool(false);
                            i.Z.setSelfDeafBool(false); // Discord does this by default
                        },
                        keyEvents: {
                            keyup: !0,
                            keydown: !1
                        }
                    },
                    [S.kg4.SET_UNDEAFENED]: {
                        onTrigger: () => {
                            i.Z.setSelfDeafBool(false);
                        },
                        keyEvents: {
                            keyup: !0,
                            keydown: !1
                        }
                    },`
            }
        },
        {
            find: 'setSelfMute(e,t){',
            replacement: {
                match: /(setSelfMute[\s\S]*?}[\s\S]*?},)/,
                replace: (_, rest) => `${rest}
                    setSelfMuteBool(mute) {
                        r.Z.dispatch({
                            type: "AUDIO_SET_SELF_MUTE",
                            mute: mute,
                            playSoundEffect: true
                        });
                    },
                    setSelfDeafBool(deaf) {
                        r.Z.dispatch({
                            type: "AUDIO_SET_SELF_DEAF",
                            deaf: deaf,
                        });
                    },`
            }
        },
        {
            find: "AUDIO_TOGGLE_SELF_DEAF\:t0,",
            replacement: {
                match: /(AUDIO_TOGGLE_SELF_DEAF\:\s*t0,)/,
                replace: (rest) => `${rest}
                    AUDIO_SET_SELF_DEAF: setSelfDeaf,`
            }
        },
        {
            find: "function t0(e){let",
            replacement: {
                match: /(function t0[\s\S]*?}[\s\S]*?}[\s\S]*?})/,
                replace: (rest) => `${rest}
                    function setSelfDeaf(e) {
                        let {context: t, deaf: n, playSoundEffect: r} = e;
                        tD({
                            deaf: n
                        }, t),
                        r,
                        ej.eachConnection(ty)
                    }`
            }
        }
    ],
});
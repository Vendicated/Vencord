/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./tooltip.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Tooltip } from "@webpack/common";
import { React } from "webpack/common/react";

function toneIndicator(short: string[], long: string) {
    return {
        short: short,
        long: long,
    };
}
interface ToneIndicator {
    short: string[],
    long: string,
}

const toneIndicators = [
    toneIndicator(["j"], "joking"),
    toneIndicator(["hj"], "half-joking"),
    toneIndicator(["s", "sarc"], "sarcastic"),
    toneIndicator(["gen", "g"], "genuine"),
    toneIndicator(["srs"], "serious"),
    toneIndicator(["nsrs"], "non-serious"),
    toneIndicator(["pos", "pc"], "positive connotation"),
    toneIndicator(["neu"], "neutral connotation"),
    toneIndicator(["neg", "nc", "ng"], "negative connotation"),
    toneIndicator(["p"], "platonic"),
    toneIndicator(["r"], "romantic"),
    toneIndicator(["c"], "copypasta"),
    toneIndicator(["l", "ly", "lyr"], "lyrics"),
    toneIndicator(["lh"], "light-hearted"),
    toneIndicator(["nm"], "not mad"),
    toneIndicator(["lu"], "a little upset"),
    toneIndicator(["nbh"], "vagueposting/venting directed at nobody here"),
    toneIndicator(["nsb"], "not subtweeting"),
    toneIndicator(["sx", "x"], "sexual intent"), // brother ew
    toneIndicator(["nsx", "nx"], "non-sexual intent"),
    toneIndicator(["rh", "rt"], "rhetorical question"),
    toneIndicator(["t"], "teasing"),
    toneIndicator(["ij"], "inside joke"),
    toneIndicator(["m"], "metaphorically"),
    toneIndicator(["li"], "literally"),
    toneIndicator(["hyp"], "hyperbole"),
    toneIndicator(["f"], "fake"),
    toneIndicator(["th"], "threat"),
    toneIndicator(["cb"], "clickbait"),
    toneIndicator(["nf"], "not forced"),
    toneIndicator(["nay"], "not at you"),
    toneIndicator(["ref"], "reference"),
    toneIndicator(["npa"], "not passive aggressive"),
    toneIndicator(["pa"], "passive aggressive"),
    toneIndicator(["genq"], "genuine question"),
    toneIndicator(["q"], "quote"),
    toneIndicator(["nav"], "not a vent"),
    toneIndicator(["a"], "affectionate"),
    toneIndicator(["nr"], "not rushing")
];
const f = toneIndicators.reduce((ret, cur) => {
    return {
        ...ret,
        ...cur.short.reduce((ret, cur_s) => {
            return {
                ...ret,
                [cur_s]: cur
            };
        }, {})
    };
}, {});

interface ReactProps {
    tag: ToneIndicator;
    text: string;
    type: "tonetag";
}

type ParseReturn = ReactProps | { type: "text", content: string; };

export default definePlugin({
    name: "ToneIndicators",
    description: "Adds descriptions when hovering over tone indicators.",
    nexulien: true,
    authors: [Devs.Jaegerwald, Devs.Zoid, Devs.sadan],

    patches: [
        {
            find: "roleMention:{order:",
            replacement: {
                match: /emoticon:\{order:(\i\.\i\.order)/,
                replace: "tonetag:$self.makeRule($1),$&"
            },
        },
        {
            find: "Unknown markdown rule:",
            replacement: [
                {
                    match: /roleMention:\{type:/,
                    replace: "tonetag:{type: 'inlineObject'},$&"
                },
            ]
        }
    ],
    makeRule(order: number) {
        const TONE_REGEXP = /^\/(\w+)/;
        return {
            order,
            requiredFirstCharacters: ["/"],
            match: text => {
                return TONE_REGEXP.exec(text);
            },
            parse: (matchedContent: RegExpExecArray, _, parseProps: Record<string, any>): ParseReturn => {
                try {
                    if (f[matchedContent[1]] !== undefined && parseProps.messageId) {
                        return {
                            type: "tonetag",
                            text: matchedContent[0],
                            tag: f[matchedContent[1]]
                        };
                    }
                } catch (e) {
                    console.error(e);
                }
                return {
                    type: "text",
                    content: matchedContent[0]
                };
            },

            react: ({ text, tag }: ReactProps) => {
                return (<Tooltip text={tag.long} tooltipClassName="toneIndicator">
                    {props => <span
                        {...props}
                        className="inChatText"
                    >
                        {text}
                    </span>}
                </Tooltip>);
            }
        };
    },

});

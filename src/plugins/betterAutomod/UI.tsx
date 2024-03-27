/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Text, TextArea, Forms, useMemo, useState } from "@webpack/common";

import { AutoModRule, matchRules, MatchedRule } from "./automod";

export function settingsAboutComponent() {
    return (<>
        <Forms.FormTitle tag="h3">Description and How to use:</Forms.FormTitle>
        <Forms.FormText style={{ fontSize: "14px" }}>
            <Text>
                This plugin allows you to test your AutoMod rules. Simply input a message into the box in the automod settings,
                it will check if the message matches any of your rules.
                <br />it echos automod logs to the automoded channel to do so:
                <br />You must setup a logs channel and you should have the permissions to view it.
            </Text>
        </Forms.FormText>
    </>);
}

export function renderTestTextHeader() {
    return (<Text variant="heading-lg/normal" className="automod-test-header">Test AutoMod</Text>);
}

export function TestInputBoxComponent(props: { currentRules: AutoModRule[] | null; }) {
    const [inputValue, setInputValue] = useState("");
    const [warningText, setWarningText] = useState("");
    const { currentRules: currentRulesProp } = props;
    const currentRules: null | Array<AutoModRule> = currentRulesProp;

    useMemo(() => {
        if (!inputValue || !currentRules) return null;
        const match: null | MatchedRule = currentRules ? matchRules(inputValue, currentRules) : null;
        if (match !== null) {
            setWarningText(`Match: ${match.rule.name}, filter: ${JSON.stringify(match.filter)}`);
        } else {
            setWarningText("");
        }
    }, [inputValue, currentRules]);
    return (
        <div>
            <TextArea
                className="automod-test-box"
                value={inputValue}
                placeholder="Type something to test automod (Supports filters only)"
                onChange={setInputValue}
                id="AutomodTestBox"
            />
            <p
                style={{ display: warningText ? "block" : "none" }}
                className="automod-test-text-warning"
            >
                {warningText}
            </p>
        </div>
    );
}
export { Forms };

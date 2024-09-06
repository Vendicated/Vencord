/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Link } from "@components/Link";
import { Forms, Text, TextArea, useMemo, useState } from "@webpack/common";

import { AutoModRule, MatchedRule, matchRules } from "./automod";


export function settingsAboutComponent() {
    return (<>
        <Forms.FormTitle tag="h3">Description and How to use:</Forms.FormTitle>
        <Forms.FormText>
            <Text variant="heading-sm/normal">
                This plugin allows you to test your AutoMod rules. Simply input a message into the box in the automod settings,
                it will check if the message matches any of your rules.
                <br />it echos automod logs to the automoded channel to do so:
                <br />You must setup a logs channel and you should have the permissions to view it.
                <br />for more info about automod check <Link href="https://discord.com/blog/automod-launch-automatic-community-moderation">here</Link>
            </Text>
        </Forms.FormText>
    </>);
}

export function TestInputBoxComponent({ currentRules }: { currentRules: Array<AutoModRule>; }) {
    const [inputValue, setInputValue] = useState("");
    const [warningText, setWarningText] = useState("");
    useMemo(() => {
        if (!inputValue || !currentRules) return null;
        const match: null | MatchedRule = currentRules ? matchRules(inputValue.trim(), currentRules) : null;
        if (match !== null) {
            setWarningText(`Match: ${match.rule.name}, filter: ${JSON.stringify(match.filter)}`);
        } else {
            setWarningText("");
        }
    }, [inputValue]);
    return (
        <div>
            <Text variant="heading-lg/normal" className="vc-ba-automod-test-header">Test AutoMod</Text>
            <TextArea
                className="vc-ba-automod-test-box"
                value={inputValue}
                placeholder="Type something to test automod (Supports filters only)"
                onChange={setInputValue}
                id="AutomodTestBox"
            />
            <p
                style={{ display: warningText ? "block" : "none" }}
                className="vc-ba-automod-test-text-warning"
            >
                {warningText}
            </p>
        </div>
    );
}

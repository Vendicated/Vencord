/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Text, TextArea, useMemo, useState } from "@webpack/common";
import { GuildMember } from "discord-types/general";

import { AutoModRule, match_rules, MatchedRule } from "./automod";


export function renderTestTextHeader() {
    return (<Text variant="heading-lg/normal">Test AutoMod</Text>);
}

export function TestInputBoxComponent(props: { currentRules: AutoModRule[] | null; }) {
    const [inputValue, setInputValue] = useState("");
    const [warningText, setWarningText] = useState("");
    const { currentRules: currentRulesProp } = props;
    const currentRules: null | Array<AutoModRule> = currentRulesProp;

    useMemo(() => {
        if (!inputValue || !currentRules) return null;
        const match: undefined | MatchedRule = currentRules ? match_rules(inputValue, currentRules) : undefined;
        console.log(match);
        console.log(inputValue);
        if (match !== undefined) {
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

const download = (filename: string, content: string, type: string = "text/plain") => {
    const link = document.createElement("a");
    const file = new Blob([content], { type: type });
    link.href = URL.createObjectURL(file);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
};


export function ExportButton(props: { currentGuildId: string | null; currentBanList: Array<GuildMember> | null; }) {
    const { currentGuildId, currentBanList } = props;
    if (!currentGuildId || !currentBanList) return null;
    return (<Button onClick={() => download(currentGuildId + "-bans.json", JSON.stringify(currentBanList, null, 4))} className={"export-button"}>Export</Button>);
}


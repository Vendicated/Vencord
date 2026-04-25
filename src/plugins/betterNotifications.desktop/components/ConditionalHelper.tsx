/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CodeBlock } from "@components/CodeBlock";
import { FormSwitch } from "@components/FormSwitch";
import { Paragraph } from "@components/Paragraph";
import { MessageRecordFields } from "@plugins/betterNotifications.desktop/types/advancedNotification";
import { Replacements } from "@plugins/betterNotifications.desktop/utils/Variables";
import { SelectOption } from "@vencord/discord-types";
import { React, Select, TextInput } from "@webpack/common";

export default function ConditionalHelper() {
    const [usingCustomResult, setUsingCustomResult] = React.useState<boolean>(false);
    const [conditionalComparison, setConditionalComparison] = React.useState<string>("");
    const [conditionalComparitor, setConditionalComparitor] = React.useState<string>("");
    const [conditionalResult, setConditionalResult] = React.useState<string>("");
    const [comparisonValue, setComparisonValue] = React.useState<string>("");

    const [resultSurrounders, setResultSurrounders] = React.useState<string>("");

    React.useEffect(() => {
        if (usingCustomResult) {
            setResultSurrounders('"');
        } else {
            setResultSurrounders("");
        }
    }, [usingCustomResult]);

    return <>
        <FormSwitch hideBorder={true} onChange={setUsingCustomResult} value={usingCustomResult} title="Use custom text for result" description="Allows you to put custom text as the result of conditionals" />
        <div className="conditional-wrapper" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "8px" }}>
            {usingCustomResult ? (
                <TextInput placeholder="Something" value={conditionalResult} onChange={setConditionalResult} />
            ) :
                <Select select={setConditionalResult} isSelected={val => val === conditionalResult} serialize={val => String(val)} options={Object.values(Replacements).map(replacement => ({ label: replacement, value: replacement })) as SelectOption[]} />
            }
            <Paragraph style={{ "fontSize": "20px" }}>if</Paragraph>
            <Select popoutWidth={260} select={setConditionalComparison} isSelected={val => val === conditionalComparison} serialize={val => String(val)} options={Object.keys(MessageRecordFields).map(value => ({ label: value, value: value })) as SelectOption[]} />
            <Select select={setConditionalComparitor} isSelected={val => val === conditionalComparitor} serialize={val => String(val)} options={[{ label: "is", value: "is" }, { label: "is not", value: "isnot" }, { label: "contains", value: "contains" }, { label: "doesn't contain", value: "containsnot" }] as SelectOption[]} />
            {MessageRecordFields[conditionalComparison] === "boolean" ? (
                <Select select={setComparisonValue} isSelected={val => val === comparisonValue} serialize={val => String(val)} options={[{ label: "true", value: "true" }, { label: "false", value: "false" }] as SelectOption[]} />
            ) :
                MessageRecordFields[conditionalComparison] === "number" ? (
                    <TextInput type="number" placeholder="value" value={comparisonValue} onChange={setComparisonValue} />
                ) :
                    <TextInput placeholder="value" value={comparisonValue} onChange={setComparisonValue} />
            }
        </div>
        <Paragraph>Paste this into your notification format: </Paragraph>
        <CodeBlock lang="text" content={`[${resultSurrounders}${conditionalResult}${resultSurrounders} if ${conditionalComparison} ${conditionalComparitor} ${comparisonValue}]`} />
    </>;
}

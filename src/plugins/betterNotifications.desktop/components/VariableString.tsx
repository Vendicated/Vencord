/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, React, Text, TextInput } from "@webpack/common";

import { settings } from "..";
import { Replacements } from "../utils/Variables";

const OpeningVar = "{";
const ClosingVar = "}";

type ExampleReplacement = {
    [k in typeof Replacements[number]]: string
};


enum FailReason {
    VariableName,
    ParenthesisOpen,
    ParenthesisLeftOpen,
    ParenthesisClosed
}

interface VariableResult {
    valid: boolean,
    type?: FailReason,
    invalidVariable?: string,
    parenthesisIndex?: number,
    currentVariable?: string;
}

function replaceStringWithVars(input: string) {
    const examples: ExampleReplacement = {
        username: settings.store.userPrefix + "cooluser12",
        nickname: "Cool User 12",
        body: "Want to test out this new plugin I found?",
        channelId: "1282951630847295163",
        channelName: settings.store.channelPrefix + "general",
        groupName: "General discussion",
        guildName: "Super generic server",
        guildDescription: "A peaceful place for all",
        guildTag: "VENC"
    };
    new Map(Object.entries(examples)).forEach((value, key) => {
        input = input.replaceAll(`{${key}}`, value);
    });
    return input;
}

function getVariableHinting(unfinishedVar: string): string[] {
    if (!unfinishedVar) {
        return [];
    }

    const matches: string[] = [];

    Replacements.forEach(variable => {
        if (variable.startsWith(unfinishedVar)) {
            matches.push(variable);
        }
    });
    return matches;
}

function checkVariables(value: string): VariableResult {
    let failResult: VariableResult = {
        valid: true
    };

    const variables: string[] = [];
    let parenthesisOpen: boolean = false;
    let tempString: string = "";
    let valid: boolean = true;
    let escapingNextCharacter: boolean = false;

    for (let i = 0; i < value.length; i++) {
        const char = value[i];

        if (char === "\\") {
            escapingNextCharacter = true;
            continue;
        }

        if (escapingNextCharacter) {
            escapingNextCharacter = false;
            continue;
        }

        if (parenthesisOpen) {
            if (char === OpeningVar) {
                valid = false;

                failResult = {
                    valid: false,
                    type: FailReason.ParenthesisOpen,
                    parenthesisIndex: i,
                    currentVariable: tempString
                };

                break;
            }
            if (char === ClosingVar) {
                parenthesisOpen = false;
                variables.push(tempString);
                tempString = "";
                continue;
            }
            tempString += char;
        }
        else {
            if (char === ClosingVar) {
                valid = false;

                failResult = {
                    valid: false,
                    type: FailReason.ParenthesisClosed,
                    parenthesisIndex: i,
                    currentVariable: tempString
                };
                break;
            }
            if (char === OpeningVar) {
                parenthesisOpen = true;
            }
        }
    }



    if (parenthesisOpen && valid) {
        valid = false;

        failResult = {
            valid: false,
            type: FailReason.ParenthesisLeftOpen,
            parenthesisIndex: value.length,
            currentVariable: tempString
        };
    }

    variables.forEach(variable => {
        // @ts-ignore
        if (!Replacements.includes(variable)) {
            valid = false;

            failResult = {
                valid: false,
                type: FailReason.VariableName,
                invalidVariable: variable,
                currentVariable: variable
            };
        }
    });

    return failResult;
}

export default function VariableString(props: { setValue: (value: string) => void, defaultValue: string; }) {
    const [value, setValue] = React.useState<string>(props.defaultValue);

    let status: VariableResult = { valid: true };
    let [errorMessage, setErrorMessage] = React.useState<string>();
    const [exampleString, setExample] = React.useState<string>(replaceStringWithVars(value));
    const [hints, setHints] = React.useState<string[]>(getVariableHinting(""));
    const [currentVar, setCurrentVar] = React.useState<string>("");

    React.useEffect(() => {
        props.setValue(value);
        status = checkVariables(value);
        setExample(replaceStringWithVars(value));
        setHints(getVariableHinting(status.currentVariable ?? ""));
        setCurrentVar(status.currentVariable ?? "");

        let nearError: string = "";

        switch (status.type) {
            case FailReason.VariableName:
                errorMessage = `Invalid variable "${status.invalidVariable}"`;
                break;

            case FailReason.ParenthesisClosed:
                nearError = value.slice(status.parenthesisIndex! - 4, status.parenthesisIndex! + 4);
                errorMessage = `Trying to close a nonexistant variable close to ..${nearError}.. (index ${status.parenthesisIndex})`;
                break;

            case FailReason.ParenthesisOpen:
                nearError = value.slice(status.parenthesisIndex! - 4, status.parenthesisIndex! + 4);
                errorMessage = `Trying to open an already existing variable close to ..${nearError}.. (index ${status.parenthesisIndex})`;
                break;
            case FailReason.ParenthesisLeftOpen:
                errorMessage = "Parenthesis not closed properly before string ended";
                break;
            default:
                errorMessage = "";
                break;
        }

        setErrorMessage(errorMessage);
    }, [value]);


    return (
        <div>
            <ul>
                {hints.map((hintedVariable, index) => {
                    return (
                        <>
                            <li style={{
                                display: "inline-block",
                                marginRight: "0.5em"
                            }} key={hintedVariable}>
                                <Forms.FormText><b>{currentVar}</b>{hintedVariable.slice(currentVar.length)}</Forms.FormText>
                            </li>
                        </>
                    );
                })}
            </ul>
            <TextInput value={value} onChange={setValue}></TextInput>
            <TextInput style={{ marginTop: "6px", opacity: 0.5 }} value={exampleString} disabled={true}></TextInput>
            <Text style={{ marginTop: "4px", color: "red" }}>{errorMessage}</Text>
        </div>
    );
}

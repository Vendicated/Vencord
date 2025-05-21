import { Text, TextInput } from "@webpack/common";
import { React } from "@webpack/common";
import { Replacements } from "..";
import { settings } from "..";

const OpeningVar = "{";
const ClosingVar = "}";

type ExampleReplacement = {
    [k in typeof Replacements[number]]: string
};

let examples: ExampleReplacement = {
    username: "cooluser12",
    nickname: "Cool User 12",
    body: "Want to test out this new plugin I found?",
    channelId: "1282951630847295163",
    channelName: "general",
    groupName: "General discussion",
    guildName: "Super generic server",
    guildDescription: "A peaceful place for all",
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
    paranthesisIndex?: number,
}

function replaceStringWithVars(input: string) {
    new Map(Object.entries(examples)).forEach((value, key) => {
        input = input.replaceAll(`{${key}}`, value);
    });
    return input;
}

function checkVariables(value: string): VariableResult {
    let failResult: VariableResult = {
        valid: true
    };

    let variables: string[] = [];
    let paranthesisOpen: boolean = false;
    let tempString: string = "";
    let valid: boolean = true;
    let escapingNextCharacter: boolean = false;

    for (let i = 0; i < value.length; i++) {
        let char = value[i];
        if (char === "\\") {
            escapingNextCharacter = true;
            continue;
        }

        if (paranthesisOpen) {
            if (!escapingNextCharacter) {
                if (char === OpeningVar) {
                    valid = false;

                    failResult = {
                        valid: false,
                        type: FailReason.ParenthesisOpen,
                        paranthesisIndex: i
                    };

                    break;
                }
                if (char === ClosingVar) {
                    paranthesisOpen = false;
                    variables.push(tempString);
                    tempString = "";
                    continue;
                }
                tempString += char;
            } else {
                console.log("Escaping next character...");
            }
        }
        else if (!escapingNextCharacter) {
            if (char === ClosingVar) {
                valid = false;

                failResult = {
                    valid: false,
                    type: FailReason.ParenthesisClosed,
                    paranthesisIndex: i
                };
                break;
            }
            if (char === OpeningVar) {
                paranthesisOpen = true;
            }
        }


        escapingNextCharacter = false;
    }

    if (paranthesisOpen && valid) {
        valid = false;

        failResult = {
            valid: false,
            type: FailReason.ParenthesisLeftOpen,
            paranthesisIndex: value.length
        };
    }



    variables.forEach(variable => {
        // @ts-ignore
        if (!Replacements.includes(variable)) {
            valid = false;

            failResult = {
                valid: false,
                type: FailReason.VariableName,
                invalidVariable: variable
            };
        }
    });



    return failResult;
}

export default function VariableString(props: { setValue: (value: string) => void, defaultValue: string; }) {

    let [value, setValue] = React.useState<string>(props.defaultValue);

    let [status] = React.useState<VariableResult>({ valid: true });
    let [errorMessage, setErrorMessage] = React.useState<string>();
    let [exampleString, setExample] = React.useState<string>(replaceStringWithVars(value));

    React.useEffect(() => {
        props.setValue(value);
        status = checkVariables(value);
        setExample(replaceStringWithVars(value));

        let nearError: string = "";

        switch (status.type) {
            case FailReason.VariableName:
                errorMessage = `Invalid variable "${status.invalidVariable}"`;
                break;

            case FailReason.ParenthesisClosed:
                nearError = value.slice(status.paranthesisIndex! - 4, status.paranthesisIndex! + 4);
                errorMessage = `Trying to close a nonexistant variable close to ..${nearError}.. (index ${status.paranthesisIndex})`;
                break;

            case FailReason.ParenthesisOpen:
                nearError = value.slice(status.paranthesisIndex! - 4, status.paranthesisIndex! + 4);
                errorMessage = `Trying to open an already existing variable close to ..${nearError}.. (index ${status.paranthesisIndex})`;
                break;
            case FailReason.ParenthesisLeftOpen:
                errorMessage = `Parenthesis not closed properly before string ended`;
                break;
            default:
                errorMessage = "";
                break;
        }

        setErrorMessage(errorMessage);
    }, [value]);

    return (
        <div>
            <TextInput value={value} onChange={setValue}></TextInput>
            <TextInput style={{ marginTop: "6px", opacity: 0.5 }} value={exampleString} disabled={true}></TextInput>
            <Text style={{ color: "red" }}>{errorMessage}</Text>
        </div>
    );
}
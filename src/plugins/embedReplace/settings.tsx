/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Clickable, Forms, React, Switch, TextInput, TooltipContainer } from "@webpack/common";

type Replacement = {
    match: string,
    replace: string,
    isRegex: boolean,
    isValid?: boolean,
    key: string,
    toDelete?: boolean
};

type RowProps = {
    replacement: Replacement,
    newRow?: boolean,
    onChange: (replacement: Replacement) => void
};

const PlusMediumIcon = findComponentByCodeLazy("M13 5a1 1 0 1 0-2");
const TrashIcon = findComponentByCodeLazy("M14.25 1c.41 0 .75.34.75.75V3h5.25c.41");
const CopyIcon = findComponentByCodeLazy("M3 16a1 1 0 0 1-1-1v-5a8");

const ReplacementRow = (props: RowProps) => {
    const [match, setMatch] = React.useState(props.replacement.match);
    const [replace, setReplace] = React.useState(props.replacement.replace);
    const [isRegex, setIsRegex] = React.useState(props.replacement.isRegex);
    const [errorString, setErrorString] = React.useState<string>();
    const [isValid, setIsValid] = React.useState(false);

    React.useEffect(() => {
        let newIsValid = (match !== undefined && replace !== undefined && match !== null && replace !== null && match !== "" && replace !== "") as boolean;

        if (isRegex) {
            try {
                new RegExp(match);
                setErrorString(undefined);
            } catch (err: any) {
                setErrorString(err.message);
                newIsValid = false;
            }
        }
        setIsValid(newIsValid);
        if (props?.newRow) return;

        props.onChange({ match, replace, isRegex, key: props.replacement.key, isValid: newIsValid });

    }, [match, replace, isRegex]);

    // @ts-ignore
    return (
        <div className={"vc-embed-replace-row"}>
            <div className={"vc-embed-replace-row-line"}>
                <TextInput value={match}
                           className={"vc-embed-replace-row-text-input"}
                           placeholder={"Match" + (isRegex ? " Regex" : " Text")}
                           onChange={setMatch}
                           error={errorString}
                           label="Match"/>
                <TextInput value={replace}
                           className={"vc-embed-replace-row-text-input"}
                           onChange={setReplace}
                           placeholder="Replace"
                           label="Replace"/>
                {props?.newRow && isValid &&
                    <TooltipContainer text="Save">
                        <Clickable
                            className="vc-embed-replace-button vc-embed-replace-save"
                            onClick={() => {
                                const updatedReplacement = {
                                    match,
                                    replace,
                                    isRegex,
                                    key: props?.newRow ? Math.random().toString(36).substring(7) : props.replacement.key,
                                    toSave: true
                                };

                                props.onChange(updatedReplacement);

                                setMatch("");
                                setReplace("");
                                setIsRegex(false);
                            }}>
                            <PlusMediumIcon name="Save" color={"green"}/>
                        </Clickable>
                    </TooltipContainer>
                }
                {!props?.newRow &&
                    <div className="vc-embed-flex-row">
                        <TooltipContainer text="Duplicate">
                            <Clickable
                                className="vc-embed-replace-button vc-embed-replace-duplicate"
                                onClick={() => {
                                    const newRep = {
                                        match,
                                        replace,
                                        isRegex,
                                        key: Math.random().toString(36).substring(7),
                                        isValid
                                    };

                                    props.onChange(newRep);
                                }}>
                                <CopyIcon name="Duplicate" color={"grey"}/>
                            </Clickable>
                        </TooltipContainer>
                        <TooltipContainer text="Delete">
                            <Clickable
                                className="vc-embed-replace-button vc-embed-replace-delete"
                                onClick={() => {
                                    const updatedReplacement = {
                                        match,
                                        replace,
                                        isRegex,
                                        key: props.replacement.key,
                                        toDelete: true,
                                    };

                                    props.onChange(updatedReplacement);
                                }}>
                                <TrashIcon name="Delete" color="red"/>
                            </Clickable>
                        </TooltipContainer>
                    </div>}
            </div>
            <div className={"vc-embed-replace-row-line"}>
                <Switch value={isRegex}
                        onChange={setIsRegex}
                        className="vc-embed-replace-row-switch">
                    Regex
                </Switch>
            </div>
        </div>
    );
};

export const settings = definePluginSettings({
    replacements: {
        type: OptionType.COMPONENT,
        description: "The URL replacements to apply",
        component(componentProps) {
            const [reps, setReplacements] = React.useState(settings.store.replacements ?? []);

            const onChange = (newRep: Replacement) => {
                setReplacements(prevReps => {
                    if (!prevReps.some(rep => rep.key === newRep.key)) {
                        return [...prevReps, newRep];
                    }

                    const updatedReps = prevReps.map((rep: Replacement) =>
                        rep.key === newRep.key ? { ...rep, ...newRep } : rep
                    ).filter(rep => !rep.toDelete);

                    componentProps.setValue(updatedReps.map((rep: Replacement) => ({
                        match: rep.match,
                        replace: rep.replace,
                        isRegex: rep.isRegex,
                        key: rep.key,
                        isValid: rep.isValid ?? true
                    })));

                    return updatedReps;
                });
            };

            const rows = reps?.map((rep, _) => {
                return <ReplacementRow key={rep?.key} replacement={rep} onChange={onChange}/>;
            });

            return (
                <Forms.FormSection title="URL Replacements">
                    <Forms.FormText>These replacements will be applied to URLs before they are used to fetch embeds</Forms.FormText>
                    <Forms.FormText>Changes do not take effect until you save and close</Forms.FormText>
                    <Forms.FormText>Any changes will only take effect on newly loaded embeds, reload to apply to already loaded embeds</Forms.FormText>

                    <ReplacementRow replacement={{ match: "", replace: "", isRegex: false, key: "" }} newRow={true} onChange={onChange}/>
                    {rows}

                </Forms.FormSection>
            );
        }
    }
}).withPrivateSettings<{
    replacements: Replacement[]
}>();

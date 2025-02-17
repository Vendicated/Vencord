/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../styles/main.css";

import { classNameFactory } from "@api/Styles";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Forms, TextInput, useState } from "@webpack/common";

import { Param } from "..";


const cl = classNameFactory("vc-parameters-configurator-modal-");
function ParamDefiner({ name, value, onChange }: { name: string, value: string, onChange: (newValue: string) => void }) {
    return (
        <>
            <Forms.FormTitle tag="h6" className={cl("title")}>
                {`"${name}" default value:`}
            </Forms.FormTitle>
            <div className={cl("text-input")}>
                <TextInput
                    placeholder="Leave empty for Required option"
                    value={value}
                    onChange={e => onChange(e)}
                />
            </div>
        </>
    );
}

export function ParamsConfigModal({ modalProps, params, onSave }: { modalProps: ModalProps; params: string[]; onSave: (values: { [key: string]: string }) => void; }) {
    const [paramValues, setParamValues] = useState<{ [key: string]: string }>(() => {
        const initialValues: { [key: string]: string } = {};
        params.forEach(p => {
            initialValues[p] = "";
        });
        return initialValues;
    });

    const handleSave = () => {
        onSave(paramValues);
        modalProps.onClose();
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
            <ModalHeader className={cl("header")}>
                <Forms.FormTitle tag="h5" className={cl("title")}>
                    MessageTags Parameters Configurator
                </Forms.FormTitle>
                <ModalCloseButton onClick={modalProps.onClose} className={cl("close-button")} />
            </ModalHeader>

            <ModalContent className={cl("content")}>
                {params.map((param, index) => (
                    <ParamDefiner
                        key={index}
                        name={param}
                        value={paramValues[param]}
                        onChange={newValue =>
                            setParamValues(prev => ({ ...prev, [param]: newValue }))
                        }
                    />
                ))}
                <Flex className={classes(Margins.bottom8, Margins.top8)}>
                    <Button
                        look={Button.Looks.LINK}
                        color={Button.Colors.PRIMARY}
                        onClick={modalProps.onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        look={Button.Looks.FILLED}
                        color={Button.Colors.BRAND}
                        onClick={handleSave}
                    >
                        Save & Close
                    </Button>
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}

function ParamPreviewer({ name, value, onChange }: { name: string, value: string, onChange: (newValue: string) => void }) {
    return (
        <>
            <Forms.FormTitle tag="h6" className={cl("title")}>
                {`"${name}" value:`}
            </Forms.FormTitle>
            <div className={cl("text-input")}>
                <CheckedTextInput
                    value={value}
                    onChange={e => onChange(e)}
                    validate={v => !!v || "Value must not be empty."}
                />
            </div>
        </>
    );
}

export function ParamsPreviewModal({ modalProps, params, onSave }: { modalProps: ModalProps; params: Param[]; onSave: (values: { [key: string]: string }) => void; }) {
    const [paramValues, setParamValues] = useState<{ [key: string]: string }>(() => {
        const initialValues: { [key: string]: string } = {};
        params.forEach(p => {
            initialValues[p.name] = p.default || "";
        });
        return initialValues;
    });

    const handleSave = () => {
        onSave(paramValues);
        modalProps.onClose();
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
            <ModalHeader className={cl("header")}>
                <Forms.FormTitle tag="h5" className={cl("title")}>
                    MessageTags Parameters Configurator
                </Forms.FormTitle>
                <ModalCloseButton onClick={modalProps.onClose} className={cl("close-button")} />
            </ModalHeader>

            <ModalContent className={cl("content")}>
                {params.map((param, index) => (
                    <ParamPreviewer
                        key={index}
                        name={param.name}
                        value={paramValues[param.name]}
                        onChange={newValue =>
                            setParamValues(prev => ({ ...prev, [param.name]: newValue }))
                        }
                    />
                ))}
                <Flex className={classes(Margins.bottom8, Margins.top8)}>
                    <Button
                        look={Button.Looks.LINK}
                        color={Button.Colors.PRIMARY}
                        onClick={modalProps.onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        look={Button.Looks.FILLED}
                        color={Button.Colors.BRAND}
                        onClick={handleSave}
                    >
                        Save & Close
                    </Button>
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}

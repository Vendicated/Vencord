/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Button, Forms, Text, TextInput, useEffect, useState } from "@webpack/common";

import { checkPassword } from "../data";

export enum ModalType {
    Lock = "Lock",
    Unlock = "Unlock",
    Access = "Access"
}

interface Props {
    channelId: string;
    type: ModalType;
    callback: (password?: string) => void;
    modalProps: ModalProps;
}

const cl = classNameFactory("vc-password-modal-");

export function PasswordModal({ channelId, type, callback, modalProps }: Props) {

    const [password, setPassword] = useState("");
    const [confirmPasswordValue, setConfirmPasswordValue] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        (async () => {
            if (password !== confirmPasswordValue && [ModalType.Lock, ModalType.Unlock].includes(type)) {
                setError("Passwords do not match");
            } else if (password === "") {
                setError("Please enter a password");
            }
            else if (type !== ModalType.Lock && !(await checkPassword(password, channelId))) {
                setError("Incorrect Password");
            } else {
                setError("");
            }
        })();
    }, [password, confirmPasswordValue]);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        if (error) return callback();
        modalProps.onClose();
        callback(password);
    };
    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>{type}</Text>
            </ModalHeader>

            {/* form is here so when you press enter while in the text input it submits */}
            <form onSubmit={onSubmit}>
                <ModalContent className={cl("content")}>
                    <Forms.FormSection>
                        <Forms.FormTitle>Password</Forms.FormTitle>
                        <TextInput
                            type="password"
                            value={password}
                            onChange={e => setPassword(e)}
                        />
                    </Forms.FormSection>
                    {[ModalType.Lock, ModalType.Unlock].includes(type) && (
                        <Forms.FormSection>
                            <Forms.FormTitle>Confirm Password</Forms.FormTitle>
                            <TextInput
                                type="password"
                                value={confirmPasswordValue}
                                onChange={e => setConfirmPasswordValue(e)}
                            />
                        </Forms.FormSection>
                    )}
                    <Forms.FormDivider />
                    {error && <Text color="text-danger">{error}</Text>}
                </ModalContent>
                <ModalFooter>
                    <Button type="submit" onClick={onSubmit} disabled={!!error}>{type}</Button>
                </ModalFooter>
            </form>
        </ModalRoot>
    );
}

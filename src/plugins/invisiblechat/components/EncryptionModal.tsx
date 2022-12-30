/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    openModal,
} from "@utils/modal";
import { findLazy } from "@webpack";
import { Button, Forms, React, Switch, TextInput } from "@webpack/common";

import { encrypt } from "../index";

const ComponentDispatch = findLazy(m => m.emitter?._events?.INSERT_TEXT);

function EncModal(props: ModalProps) {
    const [secret, setSecret] = React.useState("");
    const [cover, setCover] = React.useState("");
    const [password, setPassword] = React.useState("password");
    const [dontUseCover, setDontUseCover] = React.useState(false);

    const valid = secret && dontUseCover ? true : (cover && cover.match(/\w \w/));

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Encrypt Message</Forms.FormTitle>
            </ModalHeader>
            <ModalContent>
                <Forms.FormText style={{ marginTop: "10px" }}>Secret</Forms.FormText>
                <TextInput
                    onChange={(e: string) => {
                        setSecret(e);
                    }}></TextInput>
                <Forms.FormText style={{ marginTop: "10px" }}>Cover (2 or more Words!!)</Forms.FormText>
                <TextInput
                    disabled={dontUseCover}
                    onChange={(e: string) => {
                        setCover(e);
                    }}></TextInput>
                <Forms.FormText style={{ marginTop: "10px" }}>Password</Forms.FormText>
                <TextInput
                    style={{ marginBottom: "20px" }}
                    defaultValue={"password"}
                    onChange={(e: string) => {
                        setPassword(e);
                    }}></TextInput>
                <Switch
                    value={dontUseCover}
                    onChange={(e: boolean) => {
                        setDontUseCover(e);
                    }}
                >
                    Don't use a Cover
                </Switch>
            </ModalContent>
            <ModalFooter>
                <Button
                    color={Button.Colors.GREEN}
                    disabled={!valid}
                    onClick={() => {
                        if (!valid) return;
                        const encrypted = encrypt(secret, password, dontUseCover ? "d d" : cover);
                        const toSend = dontUseCover ? encrypted.replaceAll("d", "") : encrypt;
                        if (!toSend) return;

                        ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", {
                            rawText: `${toSend}`
                        });

                        props.onClose();
                    }}>
                    Send
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    style={{ left: 15, position: "absolute" }}
                    onClick={() => {
                        props.onClose();
                    }}>
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function buildEncModal(): any {
    openModal(props => <EncModal {...props} />);
}

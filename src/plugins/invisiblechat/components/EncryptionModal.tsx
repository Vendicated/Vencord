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
    ModalSize,
    openModal,
} from "@utils/modal";
import { findLazy } from "@webpack";
import { Button, React, TextInput } from "@webpack/common";

import { encrypt } from "../index";


const ComponentDispatch = findLazy(m => m.emitter?._events?.INSERT_TEXT);

function EncModal(props: ModalProps) {
    const [secret, setSecret] = React.useState("");
    const [cover, setCover] = React.useState("");
    const [password, setPassword] = React.useState("password");

    const valid = secret && cover && cover.match(/\w \w/);

    return (
        <ModalRoot {...props} size={ModalSize.DYNAMIC}>
            <ModalHeader>
                <div style={{ color: "gray", fontSize: "30px" }}>Encrypt Message</div>
            </ModalHeader>
            <ModalContent>
                <div style={{ color: "gray" }}>Secret</div>
                <TextInput
                    onChange={(e: string) => {
                        setSecret(e);
                    }}></TextInput>
                <div style={{ color: "gray" }}>Cover (2 or more Words!!)</div>
                <TextInput
                    onChange={(e: string) => {
                        setCover(e);
                    }}></TextInput>
                <div style={{ color: "gray" }}>Password</div>
                <TextInput
                    defaultValue={"password"}
                    onChange={(e: string) => {
                        setPassword(e);
                    }}></TextInput>
            </ModalContent>
            <ModalFooter>
                <Button
                    disabled={!valid}
                    onClick={() => {
                        if (!valid) return;

                        const toSend = encrypt(secret, password, cover);
                        if (!toSend) return;

                        ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", {
                            rawText: `${toSend}`
                        });

                        props.onClose();
                    }}>
                    Send
                </Button>
                <Button
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

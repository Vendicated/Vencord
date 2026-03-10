/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { insertTextIntoChatInputBox } from "@utils/discord";
import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    openModal,
} from "@utils/modal";
import { Button, Forms, React, Switch, TextInput } from "@webpack/common";

import { encrypt } from "../index";

function EncModal(props: ModalProps) {
    const [secret, setSecret] = React.useState("");
    const [cover, setCover] = React.useState("");
    const [password, setPassword] = React.useState("password");
    const [noCover, setNoCover] = React.useState(false);

    const isValid = secret && (noCover || (cover && cover.trim().split(" ").length > 1));

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Encrypt Message</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Secret</Forms.FormTitle>
                <TextInput
                    onChange={(e: string) => {
                        setSecret(e);
                    }}
                />
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Cover (2 or more Words!!)</Forms.FormTitle>
                <TextInput
                    disabled={noCover}
                    onChange={(e: string) => {
                        setCover(e);
                    }}
                />
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Password</Forms.FormTitle>
                <TextInput
                    style={{ marginBottom: "20px" }}
                    defaultValue={"password"}
                    onChange={(e: string) => {
                        setPassword(e);
                    }}
                />
                <Switch
                    value={noCover}
                    onChange={(e: boolean) => {
                        setNoCover(e);
                    }}
                >
                    Don't use a Cover
                </Switch>
            </ModalContent>

            <ModalFooter>
                <Button
                    color={Button.Colors.GREEN}
                    disabled={!isValid}
                    onClick={() => {
                        if (!isValid) return;
                        const encrypted = encrypt(secret, password, noCover ? "d d" : cover);
                        const toSend = noCover ? encrypted.replaceAll("d", "") : encrypted;
                        if (!toSend) return;

                        insertTextIntoChatInputBox(toSend);

                        props.onClose();
                    }}
                >
                    Send
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    style={{ left: 15, position: "absolute" }}
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function buildEncModal(): any {
    openModal(props => <EncModal {...props} />);
}

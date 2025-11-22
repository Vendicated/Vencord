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

import { Heading, HeadingTertiary } from "@components/Heading";
import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalRoot,
    openModal,
} from "@utils/modal";
import { Button, React, TextInput } from "@webpack/common";

import { buildEmbed, decrypt } from "../index";

export function DecModal(props: any) {
    const encryptedMessage: string = props?.message?.content;
    const [password, setPassword] = React.useState("password");

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <HeadingTertiary>Decrypt Message</HeadingTertiary>
            </ModalHeader>

            <ModalContent>
                <Heading style={{ marginTop: "10px" }}>Message with Encryption</Heading>
                <TextInput defaultValue={encryptedMessage} disabled={true}></TextInput>
                <Heading style={{ marginTop: "10px" }}>Password</Heading>
                <TextInput
                    style={{ marginBottom: "20px" }}
                    onChange={setPassword}
                />
            </ModalContent>

            <ModalFooter>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        const toSend = decrypt(encryptedMessage, password, true);
                        if (!toSend || !props?.message) return;
                        buildEmbed(props?.message, toSend);
                        props.onClose();
                    }}>
                    Decrypt
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    style={{ left: 15, position: "absolute" }}
                    onClick={props.onClose}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function buildDecModal(msg: any): any {
    openModal((props: any) => <DecModal {...props} {...msg} />);
}

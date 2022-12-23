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
    ModalRoot,
    ModalSize,
    openModal,
} from "@utils/modal";
import { Button, Forms, React, TextInput } from "@webpack/common";

import { decrypt } from "../index";

export function DecModal(props: any) {
    const secret: string = props?.message?.content;
    const [password, setPassword] = React.useState("password");

    return (
        <ModalRoot {...props} size={ModalSize.DYNAMIC}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Decrypt Message</Forms.FormTitle>
            </ModalHeader>
            <ModalContent>
                <Forms.FormText style={{ paddingTop: "10px" }}>Secret</Forms.FormText>
                <TextInput defaultValue={secret} disabled={true}></TextInput>
                <Forms.FormText>Password</Forms.FormText>
                <TextInput
                    onChange={(e: string) => {
                        setPassword(e);
                    }}></TextInput>
            </ModalContent>
            <ModalFooter>
                <Button
                    onClick={() => {
                        const toSend = decrypt(secret, password);
                        if (!toSend || !props?.message) return;
                        // @ts-expect-error
                        Vencord.Plugins.plugins.InvisibleChat.buildEmbed(props?.message, toSend);
                        props.onClose();
                    }}>
                    Decrypt
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

export function buildDecModal(msg: any): any {
    openModal((props: any) => <DecModal {...props} {...msg} />);
}

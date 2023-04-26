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

import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalRoot,
    openModal,
} from "@utils/modal";
import { Button, Forms, React, TextInput } from "@webpack/common";

import { addProfile, Profile } from "../index";

// thanks InvisibleChat plugin :3
export function AddProfileModal(props: any) {
    const [name, setName] = React.useState("name");
    const [key, setKey] = React.useState("key");
    const [color, setColor] = React.useState("color");

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Add Profile</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle tag="h5">Name</Forms.FormTitle>
                <TextInput
                    style={{ marginBottom: "20px" }}
                    onChange={setName}
                />

                <Forms.FormTitle tag="h5">Key</Forms.FormTitle>
                <TextInput
                    style={{ marginBottom: "20px" }}
                    onChange={setKey}
                />

                <Forms.FormTitle tag="h5">Color</Forms.FormTitle>
                <TextInput
                    style={{ marginBottom: "20px" }}
                    onChange={setColor}
                />
            </ModalContent>

            <ModalFooter>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={async () => {
                        const profile: Profile = {
                            name: name,
                            key: key,
                            color: color
                        };
                        await addProfile(profile).then(() => {
                            props.onClose();
                        });
                    }}>
                    Add
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

export function buildAddProfileModal(): any {
    openModal((props: any) => <AddProfileModal {...props} />);
}

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

import { Flex } from "@components/Flex";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot } from "@utils/modal";
import { Button, Text } from "@webpack/common";
import React from "react";

import { Author, Contributor } from "../../types";
import { ContributorAuthorSummary } from "../ContributorAuthorSummary";


export interface SettingsModalProps extends React.ComponentProps<typeof ModalRoot> {
    title?: string;
    onClose: () => void;
    onDone?: () => void;
    footerContent?: JSX.Element;
    closeButtonName?: string;
    author?: Author,
    contributors?: Contributor[];
}

export const SettingsModal = (props: SettingsModalProps) => {
    const doneButton =
        <Button
            size={Button.Sizes.SMALL}
            color={Button.Colors.BRAND}
            onClick={props.onDone}
        >
            {props.closeButtonName ?? "Done"}
        </Button>;

    return (
        <ModalRoot {...props}>
            <ModalHeader separator={false}>
                {props.title && <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>{props.title}</Text>}
                <div style={{ marginLeft: "auto" }}>
                    <ModalCloseButton onClick={props.onClose} />
                </div>
            </ModalHeader>
            <ModalContent style={{ marginBottom: "1em", display: "flex", flexDirection: "column", gap: "1em" }}>
                {props.children}
            </ModalContent>
            <ModalFooter>
                <Flex style={{ width: "100%" }}>
                    <div style={{ flex: 1, display: "flex" }}>
                        {(props.author || props.contributors && props.contributors.length > 0) &&

                            <Flex style={{ justifyContent: "flex-start", alignItems: "center", flex: 1 }}>
                                <ContributorAuthorSummary
                                    author={props.author}
                                    contributors={props.contributors} />
                            </Flex>
                        }
                        {props.footerContent}
                    </div>
                    <div style={{ marginLeft: "auto" }}>{doneButton}</div>
                </Flex>
            </ModalFooter>
        </ModalRoot >
    );
};

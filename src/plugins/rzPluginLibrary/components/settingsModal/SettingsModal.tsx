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

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { ContributorAuthorSummary } from "@plugins/philsPluginLibrary/components/ContributorAuthorSummary";
import { Author, Contributor } from "@plugins/philsPluginLibrary/types";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot } from "@utils/modal";
import React, { JSX } from "react";


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
            size="small"
            variant="primary"
            onClick={props.onDone}
        >
            {props.closeButtonName ?? "Done"}
        </Button>;

    return (
        <ModalRoot {...props}>
            <ModalHeader separator={false}>
                {props.title && <BaseText size="lg" weight="semibold" style={{ flexGrow: 1 }}>{props.title}</BaseText>}
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

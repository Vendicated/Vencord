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

import { Devs } from "@utils/constants";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Flex, Forms, Text } from "@webpack/common";

const url = "https://uselessfacts.jsph.pl/api/v2/facts/random?language=";
let lang = "en";

export default definePlugin({
    name: "Fact Of The Day",
    description: "Shows you a random, completely useless fact every time you open Discord.",
    authors: [Devs.MrDiamond],
    options: {
        language: {
            description: "The language of the fact.",
            type: OptionType.SELECT,
            options: [
                {
                    label: "English",
                    value: "en",
                    default: true
                },
                {
                    label: "German",
                    value: "de"
                }
            ],
            onChange: (value: string) => {
                lang = value;
            }
        }
    },
    patches: [],
    start() {
        fetch(url + lang).then(res => res.json()).then(json => {
            const fact = json.text;

            openModal(props => {
                return (
                    <Modal
                        modalProps={props}
                        text={fact}
                        title="Fact of the Day"
                    />
                );
            });
        });
    },
    stop() { },
});


function Modal({ modalProps, text, title }: { modalProps: ModalProps; text: string; title: string; }) {
    return (
        <ModalRoot transitionState={modalProps.transitionState} size={ModalSize.SMALL} className="vc-text-selectable">
            <ModalHeader separator={false}>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>{title}</Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <Forms.FormSection>
                    <Text variant="text-md/normal">{text}<br /></Text>
                </Forms.FormSection>
            </ModalContent>
            <ModalFooter separator={false}>
                <Flex flexDirection="column" style={{ width: "100%" }}>
                    <Flex style={{ marginLeft: "auto" }}>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.BRAND}
                            onClick={modalProps.onClose}
                        >
                            Cool
                        </Button>
                    </Flex>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}

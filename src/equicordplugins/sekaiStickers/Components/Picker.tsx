/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { React, ScrollerThin, Text, TextInput } from "@webpack/common";

import { characters } from "../characters.json";

export default function CharSelectModal({ modalProps, setCharacter }: { modalProps: ModalProps; setCharacter?: any; }) {
    const [search, setSearch] = React.useState<string>("");

    const memoedSearchChar = React.useMemo(() => {
        const s = search.toLowerCase();
        return characters.map((c, index) => {
            if (
                s === c.id ||
                c.name.toLowerCase().includes(s) ||
                c.character.toLowerCase().includes(s)
            ) {
                return (
                    <img key={index} onClick={() => { modalProps.onClose(); setCharacter(index); }} src={`https://st.ayaka.one/img/${c.img}`} srcSet={`https://st.ayaka.one/img/${c.img}`} loading="lazy" />
                );
            }

            return null;
        });
    }, [search, characters]);
    return (
        <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
            <ModalHeader>
                <Text variant="heading-lg/bold" style={{ flexGrow: 1 }}>Select character menu</Text>
                <ModalCloseButton onClick={modalProps.onClose} ></ModalCloseButton>
            </ModalHeader>
            <ModalContent>
                <Flex flexDirection="column" style={{ paddingTop: 12 }}>
                    <TextInput content="mafuyu" placeholder="Mafuyu" onChange={(e: string) => setSearch(e)} />
                    <ScrollerThin style={{ height: 520 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 330px)", rowGap: 6, columnGap: 5, gridTemplateRows: "repeat(3, 256px)" }}>
                            {memoedSearchChar}
                        </div>
                    </ScrollerThin>
                </Flex>

            </ModalContent>
        </ModalRoot>
    );
}

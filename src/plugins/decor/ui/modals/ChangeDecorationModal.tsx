/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { waitFor } from "@webpack";
import { Button, Text, useEffect, UserStore, useState } from "@webpack/common";
import { SKU_ID } from "plugins/decor/lib/constants";
import decorationToString from "plugins/decor/lib/utils/decorationToString";

import { Decoration } from "../../lib/api";
import { useUserDecorationsStore } from "../../lib/stores/UserDecorationsStore";
import requireDecorationModules from "../../lib/utils/requireDecorationModule";
import { AvatarDecorationPreview, DecorationGridDecoration } from "../components";

let MasonryList;
waitFor("MasonryList", m => {
    ({ MasonryList } = m);
});

export default function ChangeDecorationModal(props: any) {
    const [tryingDecoration, setTryingDecoration] = useState<Decoration | null>(null);
    const {
        decorations,
        selectedDecoration,
        fetch: fetchUserDecorations,
        clear: clearUserDecorations,
        select: selectDecoration
    } = useUserDecorationsStore();

    useEffect(() => {
        fetchUserDecorations();
    }, []);

    return <ModalRoot
        {...props}
        size={ModalSize.MEDIUM}
    >
        <ModalHeader separator={false}>
            <Text
                color="header-primary"
                variant="heading-lg/semibold"
                tag="h1"
                style={{ flexGrow: 1 }}
            >
                Change Decor Decoration
            </Text>
            <ModalCloseButton onClick={props.onClose} />
        </ModalHeader>
        <ModalContent
            scrollbarType="none"
        >
            <MasonryList
                columns={3}
                fade
                getItemHeight={() => 80}
                getItemKey={(section, item) => {
                    switch (section) {
                        case 0:
                            return item;
                        case 1:
                            return `ownDecoration-${decorations[item].hash}`;
                    }
                }}
                getSectionHeight={() => 40}
                itemGutter={12}
                paddingHorizontal={12}
                paddingVertical={0}
                removeEdgeItemGutters
                renderItem={(section, index) => {
                    switch (section) {
                        case 0:
                            return <DecorationGridDecoration
                                onSelect={() => setTryingDecoration(decorations[index])}
                                isSelected={(tryingDecoration ?? selectedDecoration)?.hash === decorations[index].hash}
                                avatarDecoration={{ asset: decorationToString(decorations[index]), skuId: SKU_ID }}
                            />;
                    }
                }}
                renderSection={() => <Text>abc</Text>}
                sections={[decorations.length]}
            />
            <AvatarDecorationPreview avatarDecorationOverride={tryingDecoration ? { asset: decorationToString(tryingDecoration), skuId: SKU_ID } : null} user={UserStore.getCurrentUser()} />
        </ModalContent>
        <ModalFooter>
            <Button
                onClick={() => selectDecoration(tryingDecoration).then(props.onClose)}
                disabled={!tryingDecoration}
            >
                Apply
            </Button>
            <Button
                onClick={props.onClose}
                color={Button.Colors.PRIMARY}
                look={Button.Looks.LINK}
            >
                Cancel
            </Button>
        </ModalFooter>
    </ModalRoot>;
}

export const openChangeDecorationModal = () =>
    requireDecorationModules().then(() => openModal(props => <ChangeDecorationModal {...props} />));

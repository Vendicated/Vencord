/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NoneIcon, PlusIcon } from "@components/Icons";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByPropsLazy, waitFor } from "@webpack";
import { Button, Forms, i18n, Text, useEffect, UserStore, useState } from "@webpack/common";
import { SKU_ID } from "plugins/decor/lib/constants";
import decorationToString from "plugins/decor/lib/utils/decorationToString";

import { Decoration } from "../../lib/api";
import { useUserDecorationsStore } from "../../lib/stores/UserDecorationsStore";
import requireDecorationModules from "../../lib/utils/requireDecorationModule";
import { AvatarDecorationPreview, DecorationGridDecoration, DecorationGridItem } from "../components";

let MasonryList;
waitFor("MasonryList", m => {
    ({ MasonryList } = m);
});
const DecorationModalStyles = findByPropsLazy("modalFooterShopButton");
const DecorationComponentStyles = findByPropsLazy("decorationGridItemChurned");

export default function ChangeDecorationModal(props: any) {
    // undefined = not trying, null = none, Decoration = selected
    const [tryingDecoration, setTryingDecoration] = useState<Decoration | null | undefined>(undefined);
    const isTryingDecoration = typeof tryingDecoration !== "undefined";

    const {
        decorations,
        selectedDecoration,
        fetch: fetchUserDecorations,
        select: selectDecoration
    } = useUserDecorationsStore();

    useEffect(() => {
        fetchUserDecorations();
    }, []);

    const activeSelectedDecoration = isTryingDecoration ? tryingDecoration : selectedDecoration;

    const masonryListData = [
        {
            title: "Your Decor Decorations",
            height: 20,
            itemKeyPrefix: "ownDecorations",
            items: ["none", ...decorations, "create"]
        }
        // TODO: Add presets
    ];

    return <ModalRoot
        {...props}
        size={ModalSize.MEDIUM}
        className={DecorationModalStyles.modal}
    >
        <div className={DecorationModalStyles.modalBody}>
            <ModalHeader separator={false} className={DecorationModalStyles.modalHeader}>
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
                className={DecorationModalStyles.modalContent}
                scrollbarType="none"
            >
                <MasonryList
                    className={DecorationComponentStyles.list}
                    columns={3}
                    sectionGutter={16}
                    fade
                    getItemHeight={() => 80}
                    getItemKey={(section, index) => {
                        const sectionData = masonryListData[section];
                        const item = sectionData.items[index];
                        return `${sectionData.itemKeyPrefix}-${typeof item === "string" ? item : item.hash}`;
                    }}
                    getSectionHeight={section => masonryListData[section].height}
                    itemGutter={12}
                    paddingHorizontal={12}
                    paddingVertical={0}
                    removeEdgeItemGutters
                    renderItem={(section, index, style) => {
                        const item = masonryListData[section].items[index];

                        if (typeof item === "string") {
                            switch (item) {
                                case "none":
                                    return <DecorationGridItem
                                        isSelected={activeSelectedDecoration === null}
                                        onSelect={() => setTryingDecoration(null)}
                                        style={style}
                                    >
                                        <NoneIcon />
                                        <Text
                                            variant="text-xs/normal"
                                            color="header-primary"
                                        >
                                            {i18n.Messages.NONE}
                                        </Text>
                                    </DecorationGridItem>;
                                case "create":
                                    return <DecorationGridItem
                                        onSelect={() => { }}
                                        style={style}
                                    >
                                        <PlusIcon style={{ padding: "3px" }} />
                                        <Text
                                            variant="text-xs/normal"
                                            color="header-primary"
                                        >
                                            Create
                                        </Text>
                                    </DecorationGridItem>;
                            }
                        } else {
                            return <DecorationGridDecoration
                                style={style}
                                onSelect={() => setTryingDecoration(item)}
                                isSelected={activeSelectedDecoration?.hash === item.hash}
                                avatarDecoration={{ asset: decorationToString(item), skuId: SKU_ID }}
                            />;
                        }
                    }}
                    renderSection={section => <Forms.FormTitle>{masonryListData[section].title}</Forms.FormTitle>}
                    sections={masonryListData.map(section => section.items.length)}
                />
                <AvatarDecorationPreview
                    className={DecorationModalStyles.modalPreview}
                    avatarDecorationOverride={isTryingDecoration ? tryingDecoration ? { asset: decorationToString(tryingDecoration), skuId: SKU_ID } : null : undefined}
                    user={UserStore.getCurrentUser()}
                />
            </ModalContent>
            <ModalFooter className={DecorationModalStyles.modalFooter}>
                <Button
                    onClick={() => {
                        selectDecoration(tryingDecoration!).then(props.onClose);
                    }}
                    disabled={!isTryingDecoration}
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
        </div>
    </ModalRoot>;
}

export const openChangeDecorationModal = () =>
    requireDecorationModules().then(() => openModal(props => <ChangeDecorationModal {...props} />));

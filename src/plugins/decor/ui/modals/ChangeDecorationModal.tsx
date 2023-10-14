/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NoneIcon, PlusIcon } from "@components/Icons";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByPropsLazy, waitFor } from "@webpack";
import { Button, ContextMenu, Forms, i18n, Text, Tooltip, useEffect, UserStore, useState } from "@webpack/common";
import cl from "plugins/decor/lib/utils/cl";

import { Decoration, getPresets, Preset } from "../../lib/api";
import { useCurrentUserDecorationsStore } from "../../lib/stores/CurrentUserDecorationsStore";
import discordifyDecoration from "../../lib/utils/discordifyDecoration";
import requireAvatarDecorationModal from "../../lib/utils/requireAvatarDecorationModal";
import { AvatarDecorationPreview, DecorationGridDecoration, DecorationGridItem } from "../components";
import DecorationContextMenu from "../components/DecorationContextMenu";
import { openCreateDecorationModal } from "./CreateDecorationModal";

let MasonryList;
waitFor("MasonryList", m => {
    ({ MasonryList } = m);
});
const DecorationModalStyles = findByPropsLazy("modalFooterShopButton");
const DecorationComponentStyles = findByPropsLazy("decorationGridItemChurned");
const ModalStyles = findByPropsLazy("closeWithCircleBackground");

export default function ChangeDecorationModal(props: any) {
    // undefined = not trying, null = none, Decoration = selected
    const [tryingDecoration, setTryingDecoration] = useState<Decoration | null | undefined>(undefined);
    const isTryingDecoration = typeof tryingDecoration !== "undefined";

    const {
        decorations,
        selectedDecoration,
        fetch: fetchUserDecorations,
        select: selectDecoration
    } = useCurrentUserDecorationsStore();

    useEffect(() => {
        fetchUserDecorations();
    }, []);

    const activeSelectedDecoration = isTryingDecoration ? tryingDecoration : selectedDecoration;

    const [presets, setPresets] = useState<Preset[]>([]);

    useEffect(() => { getPresets().then(setPresets); }, []);

    const masonryListData = [
        {
            title: "Your Decor Decorations",
            height: 20,
            itemKeyPrefix: "ownDecorations",
            items: ["none", ...decorations, "create"]
        },
        ...presets.map(preset => ({
            title: preset.name,
            height: 20,
            itemKeyPrefix: `preset-${preset.id}`,
            items: preset.decorations
        }))
    ];

    return <ModalRoot
        {...props}
        size={ModalSize.MEDIUM}
        className={DecorationModalStyles.modal}
    >
        <ModalHeader separator={false} className={cl("modal-header")}>
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
            className={cl("change-decoration-modal-content")}
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

                    // TODO: this can probably be way less duplicated
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
                                // TODO: Only allow creation when no pending decorations
                                if (decorations.some(d => d.reviewed === false)) {
                                    return <Tooltip text="You already have a decoration pending review">
                                        {tooltipProps => <DecorationGridItem
                                            {...tooltipProps}
                                            style={style}
                                        >
                                            <PlusIcon style={{ padding: "3px" }} />
                                            <Text
                                                variant="text-xs/normal"
                                                color="header-primary"
                                            >
                                                Create
                                            </Text>
                                        </DecorationGridItem>
                                        }
                                    </Tooltip>;
                                } else {
                                    return <DecorationGridItem
                                        onSelect={openCreateDecorationModal}
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
                        }
                    } else {
                        if (item.reviewed === false) {
                            return <Tooltip text={"Pending review"}>
                                {tooltipProps => (
                                    <DecorationGridDecoration
                                        {...tooltipProps}
                                        onContextMenu={e => {
                                            ContextMenu.open(e, () => (
                                                <DecorationContextMenu
                                                    decoration={item}
                                                />
                                            ));
                                        }}
                                        style={style}
                                        isSelected={activeSelectedDecoration?.hash === item.hash}
                                        avatarDecoration={discordifyDecoration(item)}
                                    />
                                )}
                            </Tooltip>;
                        } else {
                            return <DecorationGridDecoration
                                onContextMenu={e => {
                                    ContextMenu.open(e, () => (
                                        <DecorationContextMenu
                                            decoration={item}
                                        />
                                    ));
                                }}
                                style={style}
                                onSelect={() => setTryingDecoration(item)}
                                isSelected={activeSelectedDecoration?.hash === item.hash}
                                avatarDecoration={discordifyDecoration(item)}
                            />;
                        }
                    }
                }}
                renderSection={section => <Forms.FormTitle>{masonryListData[section].title}</Forms.FormTitle>}
                sections={masonryListData.map(section => section.items.length)}
            />
            <AvatarDecorationPreview
                className={DecorationModalStyles.modalPreview}
                avatarDecorationOverride={isTryingDecoration ? tryingDecoration ? discordifyDecoration(tryingDecoration) : null : undefined}
                user={UserStore.getCurrentUser()}
            />
        </ModalContent>
        <ModalFooter className={cl("modal-footer")}>
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
    </ModalRoot>;
}

export const openChangeDecorationModal = () =>
    requireAvatarDecorationModal().then(() => openModal(props => <ChangeDecorationModal {...props} />));

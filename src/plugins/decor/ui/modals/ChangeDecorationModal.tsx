/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { openInviteModal } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { closeAllModals, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findComponentByCodeLazy } from "@webpack";
import { Alerts, Button, Clipboard, FluxDispatcher, Forms, GuildStore, NavigationRouter, Parser, Text, Tooltip, useEffect, UserStore, UserUtils, useState } from "@webpack/common";
import { User } from "discord-types/general";

import { Decoration, getPresets, Preset } from "../../lib/api";
import { GUILD_ID, INVITE_KEY } from "../../lib/constants";
import { useAuthorizationStore } from "../../lib/stores/AuthorizationStore";
import { useCurrentUserDecorationsStore } from "../../lib/stores/CurrentUserDecorationsStore";
import { decorationToAvatarDecoration } from "../../lib/utils/decoration";
import { settings } from "../../settings";
import { cl, DecorationModalStyles, requireAvatarDecorationModal } from "../";
import { AvatarDecorationModalPreview } from "../components";
import DecorationGridCreate from "../components/DecorationGridCreate";
import DecorationGridNone from "../components/DecorationGridNone";
import DecorDecorationGridDecoration from "../components/DecorDecorationGridDecoration";
import SectionedGridList from "../components/SectionedGridList";
import { openCreateDecorationModal } from "./CreateDecorationModal";
import { openGuidelinesModal } from "./GuidelinesModal";

const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");

function usePresets() {
    const [presets, setPresets] = useState<Preset[]>([]);
    useEffect(() => { getPresets().then(setPresets); }, []);
    return presets;
}

interface Section {
    title: string;
    subtitle?: string;
    sectionKey: string;
    items: ("none" | "create" | Decoration)[];
    authorIds?: string[];
}

interface SectionHeaderProps {
    section: Section;
    presets: Preset[];
}

function SectionHeader({ section, presets }: SectionHeaderProps) {
    const hasSubtitle = typeof section.subtitle !== "undefined";
    const hasAuthorIds = typeof section.authorIds !== "undefined";

    const [authors, setAuthors] = useState<User[]>([]);

    useEffect(() => {
        (async () => {
            if (!section.authorIds) return;

            for (const authorId of section.authorIds) {
                const author = UserStore.getUser(authorId) ?? await UserUtils.getUser(authorId);
                setAuthors(authors => [...authors, author]);
            }
        })();
    }, [section.authorIds]);

    
    const copyHash = async () => {
        const presetID = section.sectionKey.replace('preset-','');; 
        if (presetID) {
            try {
                Clipboard.copy(presetID);
                Alerts.show({ title: "Success", body: `Copied preset hash: ${presetID}`});
            } catch (err) {
                Alerts.show({ title: "Error", body: `Failed to copy preset hash ${presetID}. ${err}`});
            }
        }
    };

    return <div>
        <Flex>
            <Forms.FormTitle style={{ flexGrow: 1 }}>{section.title}</Forms.FormTitle>
            {presets.some(p => `preset-${p.id}` === section.sectionKey) && (
                <Tooltip text="Copy Preset Hash" shouldShow={true}>
                {tooltipProps => (
                    <Button
                    {...tooltipProps}
                    onClick={copyHash}
                    size={Button.Sizes.SMALL}
                    look={Button.Looks.LINK}
                    >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="currentColor"
                    >
                        <path d="M16.32 14.72a1 1 0 0 1 0-1.41l2.51-2.51a3.98 3.98 0 0 0-5.62-5.63l-2.52 2.51a1 1 0 0 1-1.41-1.41l2.52-2.52a5.98 5.98 0 0 1 8.45 8.46l-2.52 2.51a1 1 0 0 1-1.41 0ZM7.68 9.29a1 1 0 0 1 0 1.41l-2.52 2.51a3.98 3.98 0 1 0 5.63 5.63l2.51-2.52a1 1 0 0 1 1.42 1.42l-2.52 2.51a5.98 5.98 0 0 1-8.45-8.45l2.51-2.51a1 1 0 0 1 1.42 0Z"></path>
                        <path d="M14.7 10.7a1 1 0 0 0-1.4-1.4l-4 4a1 1 0 1 0 1.4 1.4l4-4Z"></path>
                    </svg>
                    </Button>
                )}
                </Tooltip>
                )}
            {hasAuthorIds && <UserSummaryItem
                users={authors}
                guildId={undefined}
                renderIcon={false}
                max={5}
                showDefaultAvatarsForNullUsers
                size={16}
                showUserPopout
                className={Margins.bottom8}
            />}
        </Flex>
        {hasSubtitle &&
            <Forms.FormText type="description" className={Margins.bottom8}>
                {section.subtitle}
            </Forms.FormText>
        }
    </div>;
}

function ChangeDecorationModal(props: ModalProps) {
    // undefined = not trying, null = none, Decoration = selected
    const [tryingDecoration, setTryingDecoration] = useState<Decoration | null | undefined>(undefined);
    const isTryingDecoration = typeof tryingDecoration !== "undefined";

    const avatarDecorationOverride = tryingDecoration != null ? decorationToAvatarDecoration(tryingDecoration) : tryingDecoration;

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
    const activeDecorationHasAuthor = typeof activeSelectedDecoration?.authorId !== "undefined";
    const hasDecorationPendingReview = decorations.some(d => d.reviewed === false);

    const presets = usePresets();
    const presetDecorations = presets.flatMap(preset => preset.decorations);

    const activeDecorationPreset = presets.find(preset => preset.id === activeSelectedDecoration?.presetId);
    const isActiveDecorationPreset = typeof activeDecorationPreset !== "undefined";

    const ownDecorations = decorations.filter(d => !presetDecorations.some(p => p.hash === d.hash));

    const data = [
        {
            title: "Your Decorations",
            subtitle: "You can delete your own decorations by right clicking on them.",
            sectionKey: "ownDecorations",
            items: ["none", ...ownDecorations, "create"]
        },
        ...presets.map(preset => ({
            title: preset.name,
            subtitle: preset.description || undefined,
            sectionKey: `preset-${preset.id}`,
            items: preset.decorations,
            authorIds: preset.authorIds
        }))
    ] as Section[];

    return <ModalRoot
        {...props}
        size={ModalSize.DYNAMIC}
        className={DecorationModalStyles.modal}
    >
        <ModalHeader separator={false} className={cl("modal-header")}>
            <Text
                color="header-primary"
                variant="heading-lg/semibold"
                tag="h1"
                style={{ flexGrow: 1 }}
            >
                Change Decoration
            </Text>
            <ModalCloseButton onClick={props.onClose} />
        </ModalHeader>
        <ModalContent
            className={cl("change-decoration-modal-content")}
            scrollbarType="none"
        >
            <ErrorBoundary>
                <SectionedGridList
                    renderItem={item => {
                        if (typeof item === "string") {
                            switch (item) {
                                case "none":
                                    return <DecorationGridNone
                                        className={cl("change-decoration-modal-decoration")}
                                        isSelected={activeSelectedDecoration === null}
                                        onSelect={() => setTryingDecoration(null)}
                                    />;
                                case "create":
                                    return <Tooltip text="You already have a decoration pending review" shouldShow={hasDecorationPendingReview}>
                                        {tooltipProps => <DecorationGridCreate
                                            className={cl("change-decoration-modal-decoration")}
                                            {...tooltipProps}
                                            onSelect={!hasDecorationPendingReview ? (settings.store.agreedToGuidelines ? openCreateDecorationModal : openGuidelinesModal) : () => { }}
                                        />}
                                    </Tooltip>;
                            }
                        } else {
                            return <Tooltip text={"Pending review"} shouldShow={item.reviewed === false}>
                                {tooltipProps => (
                                    <DecorDecorationGridDecoration
                                        {...tooltipProps}
                                        className={cl("change-decoration-modal-decoration")}
                                        onSelect={item.reviewed !== false ? () => setTryingDecoration(item) : () => { }}
                                        isSelected={activeSelectedDecoration?.hash === item.hash}
                                        decoration={item}
                                    />
                                )}
                            </Tooltip>;
                        }
                    }}
                    getItemKey={item => typeof item === "string" ? item : item.hash}
                    getSectionKey={section => section.sectionKey}
                    renderSectionHeader={section => <SectionHeader section={section} presets={presets} />}
                    sections={data}
                />
                <div className={cl("change-decoration-modal-preview")}>
                    <AvatarDecorationModalPreview
                        avatarDecorationOverride={avatarDecorationOverride}
                        user={UserStore.getCurrentUser()}
                    />
                    {isActiveDecorationPreset && <Forms.FormTitle className="">Part of the {activeDecorationPreset.name} Preset</Forms.FormTitle>}
                    {typeof activeSelectedDecoration === "object" &&
                        <Text
                            variant="text-sm/semibold"
                            color="header-primary"
                        >
                            {activeSelectedDecoration?.alt}
                        </Text>
                    }
                    {activeDecorationHasAuthor && <Text key={`createdBy-${activeSelectedDecoration.authorId}`}>Created by {Parser.parse(`<@${activeSelectedDecoration.authorId}>`)}</Text>}
                </div>
            </ErrorBoundary>
        </ModalContent>
        <ModalFooter className={classes(cl("change-decoration-modal-footer", cl("modal-footer")))}>
            <div className={cl("change-decoration-modal-footer-btn-container")}>
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
            </div>
            <div className={cl("change-decoration-modal-footer-btn-container")}>
                <Button
                    onClick={() => Alerts.show({
                        title: "Log Out",
                        body: "Are you sure you want to log out of Decor?",
                        confirmText: "Log Out",
                        confirmColor: cl("danger-btn"),
                        cancelText: "Cancel",
                        onConfirm() {
                            useAuthorizationStore.getState().remove(UserStore.getCurrentUser().id);
                            props.onClose();
                        }
                    })}
                    color={Button.Colors.PRIMARY}
                    look={Button.Looks.LINK}
                >
                    Log Out
                </Button>
                <Tooltip text="Join Decor's Discord Server for notifications on your decoration's review, and when new presets are released">
                    {tooltipProps => <Button
                        {...tooltipProps}
                        onClick={async () => {
                            if (!GuildStore.getGuild(GUILD_ID)) {
                                const inviteAccepted = await openInviteModal(INVITE_KEY);
                                if (inviteAccepted) {
                                    closeAllModals();
                                    FluxDispatcher.dispatch({ type: "LAYER_POP_ALL" });
                                }
                            } else {
                                props.onClose();
                                FluxDispatcher.dispatch({ type: "LAYER_POP_ALL" });
                                NavigationRouter.transitionToGuild(GUILD_ID);
                            }
                        }}
                        color={Button.Colors.PRIMARY}
                        look={Button.Looks.LINK}
                    >
                        Discord Server
                    </Button>}
                </Tooltip>
            </div>
        </ModalFooter>
    </ModalRoot>;
}

export const openChangeDecorationModal = () =>
    requireAvatarDecorationModal().then(() => openModal(props => <ChangeDecorationModal {...props} />));

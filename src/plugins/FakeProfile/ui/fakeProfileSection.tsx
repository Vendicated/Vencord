/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Flex } from "@components/Flex";
import { findComponentByCodeLazy } from "@webpack";
import { Button, Toasts, UserStore } from "@webpack/common";

import { useUsersProfileStore } from "../lib/stores/UsersProfileStore";

const CustomizationSection = findComponentByCodeLazy(".customizationSectionBackground");
export const cl = classNameFactory("vc-decor-");

export function fakeProfileSection({ hideTitle = false, hideDivider = false, noMargin = false }: {
    hideTitle?: boolean;
    hideDivider?: boolean;
    noMargin?: boolean;
}) {
    const userId = UserStore.getCurrentUser().id;
    return <CustomizationSection
        title={!hideTitle && "fakeProfile"}
        hasBackground={true}
        hideDivider={hideDivider}
        className={noMargin && cl("section-remove-margin")}
    >
        <Flex>
            <Button
                onClick={async () => {
                    useUsersProfileStore.getState().fetchProfileEffects();
                    useUsersProfileStore.getState().fetchDecorations();
                    useUsersProfileStore.getState().fetch(userId, true);
                    useUsersProfileStore.getState().fetchProfileEffects();
                    Toasts.show({
                        message: "Successfully refetched fakeProfile!",
                        id: Toasts.genId(),
                        type: Toasts.Type.SUCCESS
                    });
                }}
                size={Button.Sizes.SMALL}
            >
                Refetch fakeProfile
            </Button>
        </Flex>
    </CustomizationSection>;
}

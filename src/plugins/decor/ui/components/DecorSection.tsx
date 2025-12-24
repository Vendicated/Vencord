/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { useAuthorizationStore } from "@plugins/decor/lib/stores/AuthorizationStore";
import { useCurrentUserDecorationsStore } from "@plugins/decor/lib/stores/CurrentUserDecorationsStore";
import { cl } from "@plugins/decor/ui";
import { openChangeDecorationModal } from "@plugins/decor/ui/modals/ChangeDecorationModal";
import { findComponentByCodeLazy } from "@webpack";
import { useEffect } from "@webpack/common";

const CustomizationSection = findComponentByCodeLazy(".customizationSectionBackground");

export interface DecorSectionProps {
    hideTitle?: boolean;
    hideDivider?: boolean;
    noMargin?: boolean;
}

export default function DecorSection({ hideTitle = false, hideDivider = false, noMargin = false }: DecorSectionProps) {
    const authorization = useAuthorizationStore();
    const { selectedDecoration, select: selectDecoration, fetch: fetchDecorations } = useCurrentUserDecorationsStore();

    useEffect(() => {
        if (authorization.isAuthorized()) fetchDecorations();
    }, [authorization.token]);

    return <CustomizationSection
        title={!hideTitle && "Decor"}
        hasBackground={true}
        hideDivider={hideDivider}
        className={noMargin && cl("section-remove-margin")}
    >
        <Flex gap="4px">
            <Button
                onClick={() => {
                    if (!authorization.isAuthorized()) {
                        authorization.authorize().then(openChangeDecorationModal).catch(() => { });
                    } else openChangeDecorationModal();
                }}
                variant="primary"
                size="small"
            >
                Change Decoration
            </Button>
            {selectedDecoration && authorization.isAuthorized() && <Button
                onClick={() => selectDecoration(null)}
                variant="secondary"
                size={"small"}
            >
                Remove Decoration
            </Button>}
        </Flex>
    </CustomizationSection>;
}

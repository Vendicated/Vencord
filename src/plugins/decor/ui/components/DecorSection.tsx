/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCodeLazy } from "@webpack";
import { Button, useEffect } from "@webpack/common";

import { useAuthorizationStore } from "../../lib/stores/AuthorizationStore";
import { useCurrentUserDecorationsStore } from "../../lib/stores/CurrentUserDecorationsStore";
import cl from "../../lib/utils/cl";
import showAuthorizationModal from "../../lib/utils/showAuthorizationModal";
import { openChangeDecorationModal } from "../modals/ChangeDecorationModal";

const CustomizationSection = findByCodeLazy(".customizationSectionBackground");

interface DecorSectionProps {
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
        <div style={{ display: "flex" }}>
            <Button
                onClick={() => {
                    if (!authorization.isAuthorized()) {
                        showAuthorizationModal().then(openChangeDecorationModal);
                    } else openChangeDecorationModal();
                }}
                size={Button.Sizes.SMALL}
            >
                Change Decoration
            </Button>
            {selectedDecoration && authorization.isAuthorized() && <Button
                onClick={() => selectDecoration(null)}
                color={Button.Colors.PRIMARY}
                size={Button.Sizes.SMALL}
                look={Button.Looks.LINK}
            >
                Remove Decoration
            </Button>}
        </div>
    </CustomizationSection>;
}

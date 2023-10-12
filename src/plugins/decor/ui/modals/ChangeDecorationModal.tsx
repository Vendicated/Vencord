/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalContent, ModalRoot } from "@utils/modal";

import { DecorationGridItem } from "../components";

export default function ChangeDecorationModal(props: any) {
    return <ModalRoot {...props}>
        <ModalContent>
            <DecorationGridItem>
                <p>hiii</p>
            </DecorationGridItem>
        </ModalContent>
    </ModalRoot>;
}

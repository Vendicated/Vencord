/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings, useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { ModalContent, ModalRoot, openModal } from "@utils/modal";
import { Button, Forms, TextArea, useState } from "@webpack/common";

const cl = classNameFactory("vc-userscript-modal-");

export function openUserscriptModal() {
    openModal(modalProps =>
        <ModalRoot {...modalProps}>
            <ErrorBoundary>
                <ModalContent className={cl("root")}>
                    <UserscriptModal />
                </ModalContent>
            </ErrorBoundary>
        </ModalRoot>
    );
}

function UserscriptModal() {
    const { quickUserscript } = useSettings(["quickUserscript"]);
    const [needsReload, setNeedsReload] = useState(false);
    const [value, setValue] = useState(quickUserscript);

    const placeholderCode = "/*\n * Be careful! Arbitrary JavaScript code can be written here, which could do anything.\n * Only run JavaScript from people who you would trust a plugin from.\n */";

    return (
        <>
            <Forms.FormTitle>QuickUserscript</Forms.FormTitle>
            <TextArea placeholder={placeholderCode} onChange={setValue} value={value} />
            <Flex>
                <Button
                    onClick={() => {
                        Settings.quickUserscript = value;
                        setNeedsReload(true);
                    }}
                    size={Button.Sizes.SMALL}
                >
                    Save
                </Button>
            </Flex>
            {needsReload && (
                <Forms.FormText>
                    Userscripts will not be reloaded until you <a href="#" onClick={() => location.reload()}>reload the page</a>.
                </Forms.FormText>
            )}
        </>
    );
}

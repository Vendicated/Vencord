/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { getExportString } from "@plugins/kaomojiPicker/store";
import { copyWithToast } from "@utils/discord";
import { TextInput } from "@webpack/common";

export function ExportKaomoji() {
    const exportString = getExportString();

    return (
        <Flex flexDirection="column" gap={8}>
            <BaseText size="md" weight="medium">
                Export Kaomoji
            </BaseText>

            <Flex gap={8}>
                <TextInput
                    readOnly
                    value={exportString}
                    onClick={e => (e.target as HTMLInputElement).select()}
                />
                <Button
                    variant="secondary"
                    onClick={() => copyWithToast(exportString, "Kaomoji JSON copied to clipboard !")}
                >
                    Copy
                </Button>
            </Flex>
        </Flex>
    );
}

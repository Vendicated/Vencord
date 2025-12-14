/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    originalImagesInChat: {
        type: OptionType.BOOLEAN,
        description: "Also load the original image in Chat",
        default: false,
    }
});

export default definePlugin({
    name: "FixImagesQuality",
    description: "Improves quality of images by loading them at their original resolution",
    authors: [Devs.Nuckyz, Devs.Ven],
    settings,

    patches: [
        {
            find: ".handleImageLoad)",
            replacement: {
                match: /getSrc\(\i\)\{/,
                replace: "$&var _vcSrc=$self.getSrc(this.props);if(_vcSrc)return _vcSrc;"
            }
        }
    ],

    settingsAboutComponent() {
        return (
            <Card variant="normal">
                <Flex flexDirection="column" gap="4px">
                    <Paragraph size="md" weight="semibold">The default behaviour is the following:</Paragraph>
                    <Paragraph>
                        <ul>
                            <li>&mdash; In chat, optimised but full resolution images will be loaded.</li>
                            <li>&mdash; In the image modal, the original image will be loaded.</li>
                        </ul>
                    </Paragraph>
                    <Paragraph>
                        You can also enable original image in chat, but this may cause performance issues!
                    </Paragraph>
                </Flex>
            </Card>
        );
    },

    getSrc(props: { src: string; mediaLayoutType: string; width: number; height: number; }) {
        if (!props) return;

        try {
            if (!settings.store.originalImagesInChat && props.mediaLayoutType === "MOSAIC") {
                // make sure the image is not too large
                const pixels = props.width * props.height;
                const limit = 2000 * 1200;

                if (pixels <= limit) return props.src;

                const scale = Math.sqrt(pixels / limit);
                const url = new URL(props.src);
                url.searchParams.set("width", Math.round(props.width / scale).toString());
                url.searchParams.set("height", Math.round(props.height / scale).toString());
                return url.toString();
            }

            return props.src?.replace("https://media.discordapp.net/attachments/", "https://cdn.discordapp.com/attachments/");
        } catch (e) {
            new Logger("FixImagesQuality").error("Failed to make image src", e);
            return props.src;
        }
    }
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { FormSwitch } from "@components/FormSwitch";
import { Devs, EquicordDevs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Button, Menu, TextInput, UploadHandler, useEffect, useState } from "@webpack/common";

import { QuoteIcon } from "./components/QuoteIcon";
import { QuoteFont } from "./types";
import { createQuoteImage, ensureFontLoaded, generateFileNamePreview, getFileExtension, getMimeType, resetFontLoading, sizeUpgrade } from "./utils";

const settings = definePluginSettings({
    quoteFont: {
        type: OptionType.SELECT,
        description: "Font for quote text (author/username always use M PLUS Rounded 1c)",
        options: [
            { label: "M PLUS Rounded 1c", value: QuoteFont.MPlusRounded, default: true },
            { label: "Open Sans", value: QuoteFont.OpenSans },
            { label: "Momo Signature", value: QuoteFont.MomoSignature },
            { label: "Lora", value: QuoteFont.Lora },
            { label: "Merriweather", value: QuoteFont.Merriweather }
        ]
    },
    watermark: {
        type: OptionType.STRING,
        description: "Custom watermark text (max 32 characters)",
        default: "Made with Equicord"
    },
    grayscale: {
        type: OptionType.BOOLEAN,
        description: "Enable grayscale by default",
        default: true,
        hidden: true
    },
    showWatermark: {
        type: OptionType.BOOLEAN,
        description: "Show watermark by default",
        default: false,
        hidden: true
    },
    saveAsGif: {
        type: OptionType.BOOLEAN,
        description: "Save as GIF by default",
        default: false,
        hidden: true
    }
});

export default definePlugin({
    name: "Quoter",
    description: "Adds the ability to create an inspirational quote image from a message.",
    authors: [Devs.Samwich, Devs.thororen, EquicordDevs.neoarz, EquicordDevs.Prism],
    settings,

    async start() {
        await ensureFontLoaded();
    },

    stop() {
        const style = document.getElementById("quoter-font-style");
        if (style) style.remove();
        resetFontLoading();
    },

    contextMenus: {
        "message": (children, { message }) => {
            if (!message.content) return;
            const buttonElement = (
                <Menu.MenuItem
                    id="vc-quote"
                    label="Quote"
                    icon={QuoteIcon}
                    action={() => openModal(props => <QuoteModal message={message} {...props} />)}
                />
            );

            children.push(buttonElement);
        }
    }
});

function QuoteModal({ message, ...props }: ModalProps & { message: Message; }) {
    const [gray, setGray] = useState(settings.store.grayscale);
    const [showWatermark, setShowWatermark] = useState(settings.store.showWatermark);
    const [saveAsGif, setSaveAsGif] = useState(settings.store.saveAsGif);
    const [watermarkText, setWatermarkText] = useState(settings.store.watermark);
    const [quoteImage, setQuoteImage] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const { quoteFont } = settings.store;

    useEffect(() => {
        settings.store.grayscale = gray;
        settings.store.showWatermark = showWatermark;
        settings.store.saveAsGif = saveAsGif;
    }, [gray, showWatermark, saveAsGif]);

    const generateImage = async () => {
        const image = await createQuoteImage({
            avatarUrl: sizeUpgrade(message.author.getAvatarURL()),
            quote: message.content,
            grayScale: gray,
            author: message.author,
            watermark: watermarkText,
            showWatermark,
            saveAsGif,
            quoteFont
        });
        setQuoteImage(image);

        if (previewUrl) URL.revokeObjectURL(previewUrl);

        const newUrl = URL.createObjectURL(image);
        setPreviewUrl(newUrl);
        document.getElementById("quoterPreview")?.setAttribute("src", newUrl);
    };

    useEffect(() => { generateImage(); }, [gray, showWatermark, saveAsGif, watermarkText, quoteFont]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleExport = () => {
        if (!quoteImage) return;

        const preview = generateFileNamePreview(message.content);
        const extension = getFileExtension(saveAsGif);
        const url = URL.createObjectURL(quoteImage);

        const link = document.createElement("a");
        link.href = url;
        link.download = `${preview} - ${message.author.username}.${extension}`;
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    };

    const handleSendInChat = () => {
        if (!quoteImage) return;

        const channel = getCurrentChannel();
        if (!channel) return;

        const preview = generateFileNamePreview(message.content);
        const extension = getFileExtension(saveAsGif);
        const mimeType = getMimeType(saveAsGif);
        const file = new File([quoteImage], `${preview} - ${message.author.username}.${extension}`, { type: mimeType });

        UploadHandler.promptToUpload([file], channel, 0);
        props.onClose?.();
    };

    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader separator={false}>
                <BaseText color="text-strong" size="lg" weight="semibold" tag="h1" style={{ flexGrow: 1 }}>
                    Catch Them In 4K.
                </BaseText>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent scrollbarType="none">
                <img alt="Quote preview" src="" id="quoterPreview" style={{ borderRadius: "20px", width: "100%", marginBottom: "20px" }} />

                <FormSwitch title="Grayscale" value={gray} onChange={setGray} />
                <FormSwitch
                    title="Save as GIF"
                    value={saveAsGif}
                    onChange={setSaveAsGif}
                    description="Saves/Sends the image as a GIF instead of a PNG"
                />
                <FormSwitch
                    title="Show Watermark"
                    value={showWatermark}
                    onChange={setShowWatermark}
                    hideBorder={showWatermark}
                />
                {showWatermark && (
                    <div style={{ marginTop: "8px", marginBottom: "20px" }}>
                        <TextInput
                            value={watermarkText}
                            onChange={setWatermarkText}
                            placeholder="Watermark text (max 32 characters)"
                            maxLength={32}
                        />
                    </div>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "16px", marginBottom: "16px" }}>
                    <Button color={Button.Colors.BRAND} size={Button.Sizes.MEDIUM} onClick={handleExport}>
                        Export
                    </Button>
                    <Button color={Button.Colors.BRAND} size={Button.Sizes.MEDIUM} onClick={handleSendInChat}>
                        Send
                    </Button>
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

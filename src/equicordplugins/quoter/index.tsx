/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { FormSwitch } from "@components/FormSwitch";
import { Devs, EquicordDevs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Button, Menu, TextInput, UploadHandler, useEffect, useState } from "@webpack/common";

import { QuoteIcon } from "./components";
import { createQuoteImage, ensureFontLoaded, generateFileNamePreview, QuoteFont, resetFontLoading, sizeUpgrade } from "./utils";

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
    description: "Adds the ability to create an inspirational quote image from a message",
    authors: [Devs.Samwich, Devs.thororen, EquicordDevs.neoarz],
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

            const group = findGroupChildrenByChildId("copy-text", children);
            if (!group) children.push(buttonElement);
            else group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, buttonElement);
        }
    }
});

function QuoteModal({ message, ...props }: ModalProps & { message: Message; }) {
    const [gray, setGray] = useState(settings.store.grayscale);
    const [showWatermark, setShowWatermark] = useState(settings.store.showWatermark);
    const [saveAsGif, setSaveAsGif] = useState(settings.store.saveAsGif);
    const [watermarkText, setWatermarkText] = useState(settings.store.watermark);
    const [quoteImage, setQuoteImage] = useState<Blob | null>(null);
    const { quoteFont } = settings.store;
    const safeContent = message.content ? message.content : "";

    useEffect(() => {
        settings.store.grayscale = gray;
    }, [gray]);

    useEffect(() => {
        settings.store.showWatermark = showWatermark;
    }, [showWatermark]);

    useEffect(() => {
        settings.store.saveAsGif = saveAsGif;
    }, [saveAsGif]);

    const generateImage = async () => {
        const image = await createQuoteImage({
            avatarUrl: sizeUpgrade(message.author.getAvatarURL()),
            quoteOld: safeContent,
            grayScale: gray,
            author: message.author,
            watermark: watermarkText,
            showWatermark,
            saveAsGif,
            quoteFont
        });
        setQuoteImage(image);
        document.getElementById("quoterPreview")?.setAttribute("src", URL.createObjectURL(image));
    };

    useEffect(() => { generateImage(); }, [gray, showWatermark, saveAsGif, safeContent, watermarkText, quoteFont]);

    const Export = () => {
        if (!quoteImage) return;
        const link = document.createElement("a");
        const preview = generateFileNamePreview(safeContent);
        const extension = saveAsGif ? "gif" : "png";
        link.href = URL.createObjectURL(quoteImage);
        link.download = `${preview} - ${message.author.username}.${extension}`;
        link.click();
        link.remove();
    };

    const SendInChat = () => {
        if (!quoteImage) return;
        const preview = generateFileNamePreview(safeContent);
        const extension = saveAsGif ? "gif" : "png";
        const mimeType = saveAsGif ? "image/gif" : "image/png";
        const file = new File([quoteImage], `${preview} - ${message.author.username}.${extension}`, { type: mimeType });
        // @ts-expect-error typing issue
        UploadHandler.promptToUpload([file], getCurrentChannel(), 0);
        props.onClose?.();
    };

    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader separator={false}>
                <BaseText color="header-primary" size="lg" weight="semibold" tag="h1" style={{ flexGrow: 1 }}>
                    Catch Them In 4K.
                </BaseText>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent scrollbarType="none">
                <img alt="" src="" id="quoterPreview" style={{ borderRadius: "20px", width: "100%" }} />
                <br /><br />
                <br /><br />
                <FormSwitch title="Grayscale" value={gray} onChange={setGray} />
                <FormSwitch title="Save as GIF" value={saveAsGif} onChange={setSaveAsGif} description="Saves/Sends the image as a GIF instead of a PNG" />
                {!showWatermark ? (
                    <FormSwitch
                        title="Show Watermark"
                        value={showWatermark}
                        onChange={setShowWatermark}
                    />
                ) : (
                    <>
                        <FormSwitch
                            title="Show Watermark"
                            value={showWatermark}
                            onChange={setShowWatermark}
                            hideBorder
                        />
                        <div style={{ marginTop: "8px", marginBottom: "20px" }}>
                            <TextInput
                                value={watermarkText}
                                onChange={setWatermarkText}
                                placeholder="Watermark text (max 32 characters)"
                                maxLength={32}
                            />
                        </div>
                    </>
                )}
                <br />
                <div style={{ display: "flex", gap: "5px" }}>
                    <Button color={Button.Colors.BRAND} size={Button.Sizes.SMALL} onClick={async () => await Export()}>Export</Button>
                    <Button color={Button.Colors.BRAND} size={Button.Sizes.SMALL} onClick={async () => await SendInChat()}>Send</Button>
                </div>
            </ModalContent>
            <br />
        </ModalRoot>
    );
}

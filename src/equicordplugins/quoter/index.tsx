/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { FormSwitch } from "@components/FormSwitch";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Button, Menu, Select, UploadHandler, useEffect, useState } from "@webpack/common";

import { QuoteIcon } from "./components";
import { canvasToBlob, fetchImageAsBlob, FixUpQuote, wrapText } from "./utils";

enum ImageStyle {
    inspirational
}

enum userIDOptions {
    displayName,
    userName,
    userId
}

interface QuoteImageOptions {
    avatarUrl: string;
    quoteOld: string;
    grayScale: boolean;
    imageStyle: ImageStyle;
    author: {
        username: string;
        globalName?: string;
        id: string;
    };
    userIdentifier: userIDOptions;
}


const settings = definePluginSettings({
    userIdentifier: {
        type: OptionType.SELECT,
        description: "What the author's name should be displayed as",
        options: [
            { label: "Display Name", value: userIDOptions.displayName, default: true },
            { label: "Username", value: userIDOptions.userName },
            { label: "User ID", value: userIDOptions.userId }
        ]
    }
});

export default definePlugin({
    name: "Quoter",
    description: "Adds the ability to create an inspirational quote image from a message",
    authors: [Devs.Samwich, Devs.thororen],
    settings,
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

function sizeUpgrade(url: string) {
    const u = new URL(url);
    u.searchParams.set("size", "512");
    return u.toString();
}

const preparingSentence: string[] = [];
const lines: string[] = [];

async function createQuoteImage(options: QuoteImageOptions): Promise<Blob> {
    const { avatarUrl, quoteOld, grayScale, imageStyle, author, userIdentifier } = options;

    const quote = FixUpQuote(quoteOld);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cant get 2d rendering context :(");

    let name = "";
    switch (userIdentifier) {
        case userIDOptions.displayName:
            name = author.globalName || author.username;
            break;
        case userIDOptions.userName:
            name = author.username;
            break;
        case userIDOptions.userId:
            name = author.id;
            break;
        default:
            name = "Unknown";
    }

    switch (imageStyle) {
        case ImageStyle.inspirational:
            const cardWidth = 1200;
            const cardHeight = 600;
            canvas.width = cardWidth;
            canvas.height = cardHeight;

            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, cardWidth, cardHeight);

            const avatarBlob = await fetchImageAsBlob(avatarUrl);
            const fadeBlob = await fetchImageAsBlob("https://raw.githubusercontent.com/Equicord/Equibored/main/icons/quoter/quoter.png");

            const avatar = new Image();
            const fade = new Image();

            await Promise.all([
                new Promise<void>(resolve => { avatar.onload = () => resolve(); avatar.src = URL.createObjectURL(avatarBlob); }),
                new Promise<void>(resolve => { fade.onload = () => resolve(); fade.src = URL.createObjectURL(fadeBlob); })
            ]);

            ctx.drawImage(avatar, 0, 0, cardHeight, cardHeight);

            if (grayScale) {
                ctx.globalCompositeOperation = "saturation";
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, cardWidth, cardHeight);
                ctx.globalCompositeOperation = "source-over";
            }

            ctx.drawImage(fade, cardHeight - 400, 0, 400, cardHeight);

            ctx.fillStyle = "#fff";
            ctx.font = "italic 20px Georgia";
            const quoteWidth = cardWidth / 2 - 50;
            const quoteX = cardWidth - cardHeight;
            const quoteY = cardHeight / 2 - 10;
            wrapText(ctx, `"${quote}"`, quoteX, quoteY, quoteWidth, 20, preparingSentence, lines);

            const wrappedTextHeight = lines.length * 25;

            ctx.font = "bold 16px Georgia";
            const authorNameX = cardHeight * 1.5 - ctx.measureText(`- ${name}`).width / 2 - 30;
            const authorNameY = quoteY + wrappedTextHeight + 30;
            ctx.fillText(`- ${name}`, authorNameX, authorNameY);

            preparingSentence.length = 0;
            lines.length = 0;

            return await canvasToBlob(canvas);
    }
}

function generateFileNamePreview(message: string) {
    const words = message.split(" ");
    return words.length >= 6 ? words.slice(0, 6).join(" ") : words.join(" ");
}

function QuoteModal({ message, ...props }: ModalProps & { message: Message; }) {
    const [gray, setGray] = useState(true);
    const [style, setStyle] = useState(ImageStyle.inspirational);
    const [quoteImage, setQuoteImage] = useState<Blob | null>(null);
    const { userIdentifier } = settings.store;
    const safeContent = message.content ? message.content : "";

    const generateImage = async () => {
        const image = await createQuoteImage({
            avatarUrl: sizeUpgrade(message.author.getAvatarURL()),
            quoteOld: safeContent,
            grayScale: gray,
            imageStyle: style,
            author: message.author,
            userIdentifier
        });
        setQuoteImage(image);
        document.getElementById("quoterPreview")?.setAttribute("src", URL.createObjectURL(image));
    };

    useEffect(() => { generateImage(); }, [gray, style, safeContent]);

    const Export = () => {
        if (!quoteImage) return;
        const link = document.createElement("a");
        const preview = generateFileNamePreview(safeContent);
        link.href = URL.createObjectURL(quoteImage);
        link.download = `${preview} - ${message.author.username}.png`;
        link.click();
        link.remove();
    };

    const SendInChat = () => {
        if (!quoteImage) return;
        const preview = generateFileNamePreview(safeContent);
        const file = new File([quoteImage], `${preview} - ${message.author.username}.png`, { type: "image/png" });
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
                <Select
                    look={1}
                    options={Object.keys(ImageStyle)
                        .filter(key => isNaN(parseInt(key, 10)))
                        .map(key => ({
                            label: key.charAt(0).toUpperCase() + key.slice(1),
                            value: ImageStyle[key as keyof typeof ImageStyle]
                        }))}
                    select={v => setStyle(v)}
                    isSelected={v => v === style}
                    serialize={v => v}
                />
                <br />
                <Button color={Button.Colors.BRAND} size={Button.Sizes.SMALL} onClick={async () => await Export()} style={{ display: "inline-block", marginRight: "5px" }}>Export</Button>
                <Button color={Button.Colors.BRAND} size={Button.Sizes.SMALL} onClick={async () => await SendInChat()} style={{ display: "inline-block" }}>Send</Button>
            </ModalContent>
            <br></br>
        </ModalRoot>
    );
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Menu, Switch, Text, UploadHandler,useEffect, useState } from "@webpack/common";
import { Message } from "discord-types/general";

let recentmessage: Message;
let grayscale;

export default definePlugin({
    name: "Quoter",
    description: "Adds the ability to create a quote image from a message",
    authors: [Devs.Samwich],
    start() {
        addContextMenuPatch("message", messagePatch);
    },
    stop() {
        removeContextMenuPatch("message", messagePatch);
    }
});

const messagePatch: NavContextMenuPatchCallback = (children, { message }) => () => {
    recentmessage = message;
    if (!message.content) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(
        group.findIndex(c => c?.props?.id === "copy-text") + 1,
        0,
        <Menu.MenuItem
            id="vc-quote"
            label="Quote"
            icon={QuoteIcon}
            action={async () => {
                openModal(props => <QuoteModal {...props} />);
            }}
        />
    );
};


export function QuoteIcon({
    height = 24,
    width = 24,
    className
}: {
  height?: number;
  width?: number;
  className?: string;
}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path
                d="M21 3C21.5523 3 22 3.44772 22 4V18C22 18.5523 21.5523 19 21 19H6.455L2 22.5V4C2 3.44772 2.44772 3 3 3H21ZM20 5H4V18.385L5.76333 17H20V5ZM10.5153 7.4116L10.9616 8.1004C9.29402 9.0027 9.32317 10.4519 9.32317 10.7645C9.47827 10.7431 9.64107 10.7403 9.80236 10.7553C10.7045 10.8389 11.4156 11.5795 11.4156 12.5C11.4156 13.4665 10.6321 14.25 9.66558 14.25C9.12905 14.25 8.61598 14.0048 8.29171 13.6605C7.77658 13.1137 7.5 12.5 7.5 11.5052C7.5 9.75543 8.72825 8.18684 10.5153 7.4116ZM15.5153 7.4116L15.9616 8.1004C14.294 9.0027 14.3232 10.4519 14.3232 10.7645C14.4783 10.7431 14.6411 10.7403 14.8024 10.7553C15.7045 10.8389 16.4156 11.5795 16.4156 12.5C16.4156 13.4665 15.6321 14.25 14.6656 14.25C14.1291 14.25 13.616 14.0048 13.2917 13.6605C12.7766 13.1137 12.5 12.5 12.5 11.5052C12.5 9.75543 13.7283 8.18684 15.5153 7.4116Z"
            ></path>
        </svg>
    );
}

function sizeUpgrade(url) {
    const u = new URL(url);
    u.searchParams.set("size", "1024");
    return u.toString();
}


let preparingSentence: string[] = [];
const lines: string[] = [];


async function createQuoteImage(avatarUrl: string, name: string, quoteOld: string, grayScale: boolean): Promise<Blob> {
    const quote = removeCustomEmojis(quoteOld);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Cant get 2d rendering context :(");
    }

    const cardWidth = 1200;
    const cardHeight = 600;

    canvas.width = cardWidth;
    canvas.height = cardHeight;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const avatarBlob = await fetchImageAsBlob(avatarUrl);
    const fadeBlob = await fetchImageAsBlob("https://files.catbox.moe/54e96l.png");

    const avatar = new Image();
    const fade = new Image();

    const avatarPromise = new Promise<void>(resolve => {
        avatar.onload = () => resolve();
        avatar.src = URL.createObjectURL(avatarBlob);
    });

    const fadePromise = new Promise<void>(resolve => {
        fade.onload = () => resolve();
        fade.src = URL.createObjectURL(fadeBlob);
    });

    await Promise.all([avatarPromise, fadePromise]);

    if (grayScale) {
        ctx.drawImage(avatar, 0, 0, cardHeight, cardHeight);
        ctx.globalCompositeOperation = "saturation";
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, cardWidth, cardHeight);
        ctx.globalCompositeOperation = "source-over";
    } else {
        ctx.drawImage(avatar, 0, 0, cardHeight, cardHeight);
    }
    ctx.drawImage(fade, cardHeight - 400, 0, 400, cardHeight);

    ctx.fillStyle = "#fff";
    ctx.font = "italic 20px Georgia";
    const quoteWidth = cardWidth / 2 - 50;
    const quoteX = ((cardWidth - cardHeight));
    const quoteY = cardHeight / 2 - 10;
    wrapText(ctx, quote, quoteX, quoteY, quoteWidth, 20);

    const wrappedTextHeight = lines.length * 25;

    ctx.font = "bold 16px Georgia";
    const authorNameX = (cardHeight * 1.5) - (ctx.measureText(`- ${name}`).width / 2) - 30;
    const authorNameY = quoteY + wrappedTextHeight + 30;

    ctx.fillText(`- ${name}`, authorNameX, authorNameY);
    preparingSentence.length = 0;
    lines.length = 0;
    return new Promise<Blob>(resolve => {
        canvas.toBlob(blob => {
            if (blob) {

                resolve(blob);
            } else {
                throw new Error("Failed to create Blob");
            }
        }, "image/png");
    });

    function wrapText(
        context: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number
    ) {
        const words = text.split(" ");
        for (let i = 0; i < words.length; i++) {
            const workSentence = preparingSentence.join(" ") + " " + words[i];

            if (context.measureText(workSentence).width > maxWidth) {
                lines.push(preparingSentence.join(" "));
                preparingSentence = [words[i]];
            } else {
                preparingSentence.push(words[i]);
            }
        }

        lines.push(preparingSentence.join(" "));

        lines.forEach(element => {
            const lineWidth = context.measureText(element).width;
            const xOffset = (maxWidth - lineWidth) / 2;

            y += lineHeight;
            context.fillText(element, x + xOffset, y);
        });
    }

    async function fetchImageAsBlob(url: string): Promise<Blob> {
        const response = await fetch(url);
        const blob = await response.blob();
        return blob;
    }

    function removeCustomEmojis(quote) {
        const emojiRegex = /<a?:(\w+):(\d+)>/g;
        return quote.replace(emojiRegex, "");
    }

}

function QuoteModal(props: ModalProps)
{
    const [gray, setGray] = useState(true);
    useEffect(() => {
        grayscale = gray;
        GeneratePreview();

    }, [gray]);
    return (

        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader separator={false}>
                <Text color="header-primary" variant="heading-lg/semibold" tag="h1" style={{ flexGrow: 1 }}>
                  Catch Them In 4K.
                </Text>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent scrollbarType="none">
                <img src={""} id={"quoterPreview"}style={{ borderRadius: "20px", width: "100%" }}></img>
                <br></br><br></br>
                <Switch value={gray} onChange={setGray}>Grayscale</Switch>
                <Button color={Button.Colors.BRAND_NEW} size={Button.Sizes.SMALL} onClick={() => Export()} style={{ display: "inline-block", marginRight: "5px" }}>Export</Button>
                <Button color={Button.Colors.BRAND_NEW} size={Button.Sizes.SMALL} onClick={() => SendInChat(props.onClose)} style={{ display: "inline-block" }}>Send</Button>

            </ModalContent>
            <br></br>
        </ModalRoot>
    );
}

async function SendInChat(onClose) {

    const image = await createQuoteImage(sizeUpgrade(recentmessage.author.getAvatarURL()), recentmessage.author.username, recentmessage.content, grayscale);
    const preview = generateFileNamePreview(recentmessage.content);
    const imageName = `${preview} - ${recentmessage.author.username}`;
    const file = new File([image], `${imageName}.png`, { type: "image/png" });
    UploadHandler.promptToUpload([file], getCurrentChannel(), 0);
    onClose();

}


async function Export()
{
    const image = await createQuoteImage(sizeUpgrade(recentmessage.author.getAvatarURL()), recentmessage.author.username, recentmessage.content, grayscale);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(image);
    const preview = generateFileNamePreview(recentmessage.content);

    const imageName = `${preview} - ${recentmessage.author.username}`;
    link.download = `${imageName}.png`;
    link.click();
    link.remove();
}



async function GeneratePreview()
{
    const image = await createQuoteImage(sizeUpgrade(recentmessage.author.getAvatarURL()), recentmessage.author.username, recentmessage.content, grayscale);
    document.getElementById("quoterPreview")?.setAttribute("src", URL.createObjectURL(image));
}


function generateFileNamePreview(message)
{
    const words = message.split(" ");
    let preview;
    if(words.length >= 6)
    {
        preview = words.slice(0, 6).join(" ");
    }
    else
    {
        preview = words.slice(0, words.length).join(" ");
    }
    return preview;
}

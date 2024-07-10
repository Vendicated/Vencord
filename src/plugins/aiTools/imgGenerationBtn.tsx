/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import { getCurrentChannel } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { Alerts, Button, DraftType, Forms, TextArea, UploadHandler, useState } from "@webpack/common";

import { cl } from ".";

export const ImgGenBtn: ChatBarButton = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip={"Image Generation"}
            onClick={() => openModal(props => <ImageGenModal props={props} />)}
        >
            <svg fill="currentColor" width="24" height="24" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M392.26 1042.5c137.747-57.67 292.85-15.269 425.873 116.217l4.394 4.833c116.656 146.425 149.5 279.119 97.873 394.237-128.85 287.138-740.692 328.77-810.005 332.504L0 1896.442l61.953-91.83c.989-1.539 105.013-158.728 105.013-427.192 0-141.811 92.6-279.558 225.294-334.92ZM1728.701 23.052c54.923-1.099 99.96 15.268 135.111 49.43 40.643 40.644 58.109 87.877 56.021 140.603C1908.85 474.52 1423.33 953.447 1053.15 1280.79c-24.276-64.81-63.711-136.21-125.335-213.102l-8.787-9.886c-80.078-80.187-169.163-135.11-262.423-161.473C955.276 558.002 1460.677 33.927 1728.701 23.052Z" fill-rule="evenodd" />
            </svg>

        </ChatBarButton>
    );
};

function ImageGenModal({ props }) {
    const [prompt, setPrompt] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [model, setModel] = useState<string>("i-cant-believe-its-not-photography-seco");

    const options = [
        {
            label: "ICBINP - Realistic",
            value: "i-cant-believe-its-not-photography-seco"
        },
        {
            label: "OpenJourney V4 - Realistic",
            value: "openjourney-v4"
        },
        {
            label: "Am I Real V4.1 - Realistic",
            value: "am-i-real-v4.1"
        },
        {
            label: "Anything V5 - Realistic",
            value: "anything-v5"
        },
        {
            label: "Realistic Vision V5 - Realistic",
            value: "realistic-vision-v5"
        },
        {
            label: "Dreamshaper 8 - Animated",
            value: "dreamshaper-8"
        },
        {
            label: "Pastel Mix Anime - Anime",
            value: "pastel-mix-anime"
        },
    ];

    return (
        <ModalRoot {...props}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">
                    Image Generation
                </Forms.FormTitle>

                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <Forms.FormSection className={cl("modal-section")}>
                    <Forms.FormTitle>Prompt</Forms.FormTitle>
                    <Forms.FormText>Describe what image you want to generate</Forms.FormText>
                    <TextArea disabled={loading} autoFocus className={cl("ai-generation-prompt")} placeholder="A dog on a beach" onChange={e => setPrompt(e)} />
                </Forms.FormSection>

                {/* <Forms.FormDivider />

                <Forms.FormSection className={cl("modal-section")}>
                    <Forms.FormTitle>Model</Forms.FormTitle>
                    <SearchableSelect isDisabled={loading} onChange={v => setModel(v)} value={options.find(o => o.value === model)} options={options} />
                </Forms.FormSection> */}
            </ModalContent>

            <ModalFooter className={cl("modal-footer")}>
                <Button disabled={loading || !prompt.length} onClick={async () => {
                    setLoading(true);

                    const url = (await generateImage({ prompt })).images[0];
                    const blob = dataURItoBlob(url);

                    const file = new File([blob], "image.jpeg", { type: "image/jpeg" });
                    UploadHandler.promptToUpload([file], getCurrentChannel(), DraftType.ChannelMessage);
                    props.onClose();
                }}>{loading ? "Generating..." : "Generate"}</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export default async function generateImage({ prompt, prompt_negative = "nsfw" }: { prompt: string, prompt_negative?: string; }) {
    try {
        const response = await fetch("https://hercai-app.vercel.app/image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt, data: { prompt_negative }
            }),
        });

        if (!response.ok) {
            return Alerts.show({
                title: "Error",
                body: "There was an error generating the image. Please try again later.",
            });
        }

        return (await response.json());
    } catch (error) {
        console.error(error);
        return Alerts.show({
            title: "Error",
            body: "There was an error generating the image. Please try again later.",
        });
    }
}

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(",")[0].indexOf("base64") >= 0)
        byteString = atob(dataURI.split(",")[1]);
    else byteString = unescape(dataURI.split(",")[1]);

    // separate out the mime component
    var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], { type: mimeString });
}

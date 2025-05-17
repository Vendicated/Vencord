/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { ModalCloseButton, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Button, Forms } from "@webpack/common";
import gifUrls from "file://gifUrls.txt";

export const cl = classNameFactory("brain-");

export const BrainrotWindow = ({ rootProps }: { rootProps: ModalProps; }) => {
    const openRickroll = () => {
        window.open("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "_blank");
    };
    const urlList = gifUrls.split("\n").map(url => /^\s*[^#\s]/.test(url) && url.trim());

    const randomUrl = urlList[Math.floor(Math.random() * urlList.length)] || "https://media1.tenor.com/m/2iBayblKJlsAAAAC/minecraft-minecraft-memes.gif";

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" className={cl("modal-title")}>
                    Brainrot
                </Forms.FormTitle>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <img src={randomUrl}></img>
            {
                randomUrl === "https://media1.tenor.com/m/JkMtMAjXHS8AAAAd/job-job-application.gif" ? <Button onClick={openRickroll}>Apply Now</Button> : null
            }
        </ModalRoot>
    );
};

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createAudioPlayer } from "@api/AudioPlayer";
import { classNameFactory } from "@api/Styles";
import { React } from "@webpack/common";

const cl = classNameFactory("vc-boo-");

// GitHub raw URLs for hosted assets (from Equibored repository)
const JUMPSCARE_IMAGE_URL = "https://raw.githubusercontent.com/Equicord/Equibored/03e4650cc71591796d60c40d6105c31fce9bb481/icons/boo/job.png";
const JUMPSCARE_SOUND_URL = "https://raw.githubusercontent.com/Equicord/Equibored/03e4650cc71591796d60c40d6105c31fce9bb481/sounds/boo/vine-boom.mp3";

interface JumpscareOverlayProps {
    onClose: () => void;
}

export function JumpscareOverlay({ onClose }: JumpscareOverlayProps) {
    const audioPlayer = React.useRef(createAudioPlayer(JUMPSCARE_SOUND_URL, { volume: 100 }));
    const [isClosing, setIsClosing] = React.useState(false);

    React.useEffect(() => {
        try {
            audioPlayer.current?.play();
        } catch (err) {
            console.error("Failed to play jumpscare sound:", err); // scarier than a job application
        }

        const timer = setTimeout(() => {
            startClosing();
        }, 3000);

        return () => {
            clearTimeout(timer);
            audioPlayer.current?.stop();
        };
    }, [onClose]);

    const startClosing = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 500);
    };

    const handleClick = () => {
        audioPlayer.current?.stop();
        startClosing();
    };

    return (
        <div
            onClick={handleClick}
            className={cl("jumpscare-overlay")}
            style={{
                animation: isClosing
                    ? "boo-jumpscare-fade-out 0.5s ease-out forwards"
                    : "boo-jumpscare-fade 0.2s ease-in forwards"
            }}
        >
            <img
                src={JUMPSCARE_IMAGE_URL}
                alt="Jumpscare"
                className={cl("jumpscare-image")}
            />
        </div>
    );
}

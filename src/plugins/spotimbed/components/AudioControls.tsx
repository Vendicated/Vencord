/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { proxyLazy } from "@utils/proxyLazy";
import { findLazy } from "@webpack";
import { React } from "@webpack/common";
import { Constructor } from "type-fest";

import { cl } from "../utils/misc";

interface MediaPlayerProps {
    src: string;
    type: "AUDIO" | "VIDEO";
    height: number;
    width: number;
    forceExternal: boolean;
    autoPlay: boolean;
    playable: boolean;
    fileName: string;
    fileSize: string;
    renderLinkComponent: () => React.ReactElement;
    volume: () => number;
    onMute: (muted: boolean) => void;
    onVolumeChange: (volume: number) => void;
    autoMute: () => void;
}

const MediaPlayer: Constructor<React.PureComponent<MediaPlayerProps>> = findLazy(m => m.prototype?.renderControls);
const ReclassedMediaPlayer = proxyLazy(() => {
    return class ReclassedMediaPlayer extends MediaPlayer {
        render() {
            return React.cloneElement(super.render() as React.ReactElement, { className: cl("media-player") });
        }
    };
});

export interface AudioControlsProps {
    mediaHref: string | null;
}

export const AudioControls = ({ mediaHref }: AudioControlsProps) => {
    // TODO: Move state to a setting
    const [volume, setVolume] = React.useState(0.5);

    const mediaPlayer = mediaHref ? (
        <ReclassedMediaPlayer
            key={mediaHref}
            src={mediaHref}
            type="AUDIO"
            height={300}
            width={400}
            forceExternal={false}
            autoPlay={false}
            playable={true}
            fileName=""
            fileSize=""
            renderLinkComponent={() => <></>}
            volume={() => volume}
            onMute={() => { }}
            onVolumeChange={volume => setVolume(volume)}
            autoMute={() => { }}
        />
    ) : (
        <div className={cl("placeholder-wrap")}>
            <div className={cl("placeholder", "placeholder-btn")} />
            <div className={cl("placeholder")} style={{ width: "66px" }} />
            <div className={cl("placeholder", "placeholder-scrubber")} />
            <div className={cl("placeholder", "placeholder-btn")} />
        </div>
    );

    return <div className={cl("controls")}>{mediaPlayer}</div>;
};

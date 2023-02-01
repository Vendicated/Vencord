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

import { ResourceType } from "@api/Spotify";
import { proxyLazy } from "@utils/proxyLazy";
import { findLazy } from "@webpack";
import { React } from "@webpack/common";
import { Constructor } from "type-fest";

import { useQueue } from "../hooks/useQueue";
import { settings } from "../settings";
import { DisplayResource } from "../types";
import { cl } from "../utils/misc";

interface MediaPlayerProps {
    src: string;
    type: "AUDIO" | "VIDEO";
    height?: number | "100%" | "auto";
    width?: number | "100%" | "auto";
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

const QUEUEABLE_TYPES = [ResourceType.Track];

const QueueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M14 6H4c-.55 0-1 .45-1 1s.45 1 1 1h10c.55 0 1-.45 1-1s-.45-1-1-1zm0 4H4c-.55 0-1 .45-1 1s.45 1 1 1h10c.55 0 1-.45 1-1s-.45-1-1-1zM4 16h6c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zM19 6c-1.1 0-2 .9-2 2v6.18c-.31-.11-.65-.18-1-.18c-1.84 0-3.28 1.64-2.95 3.54c.21 1.21 1.2 2.2 2.41 2.41c1.9.33 3.54-1.11 3.54-2.95V8h2c.55 0 1-.45 1-1s-.45-1-1-1h-2z"></path></svg>;
const QueuedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M4 8q-.425 0-.712-.287Q3 7.425 3 7t.288-.713Q3.575 6 4 6h10q.425 0 .713.287Q15 6.575 15 7t-.287.713Q14.425 8 14 8Zm0 4q-.425 0-.712-.288Q3 11.425 3 11t.288-.713Q3.575 10 4 10h10q.425 0 .713.287q.287.288.287.713t-.287.712Q14.425 12 14 12Zm0 4q-.425 0-.712-.288Q3 15.425 3 15t.288-.713Q3.575 14 4 14h6q.425 0 .713.287q.287.288.287.713t-.287.712Q10.425 16 10 16Zm11.65 2.3l-2.15-2.15q-.275-.275-.275-.7q0-.425.275-.7q.275-.275.688-.275q.412 0 .712.275l1.45 1.4l3.55-3.55q.275-.275.687-.275q.413 0 .713.3t.288.725q-.013.425-.313.725L17.05 18.3q-.275.275-.7.275q-.425 0-.7-.275Z"></path></svg>;

export interface AudioControlsProps {
    resource?: DisplayResource | null;
    mediaHref: string | null;
}

export const AudioControls = ({ mediaHref, resource }: AudioControlsProps) => {
    const { volume } = settings.use(["volume"]);
    const [queued, queue] = useQueue(2000);

    const mediaPlayer = mediaHref ? (
        <ReclassedMediaPlayer
            key={mediaHref}
            src={mediaHref}
            type="AUDIO"
            width={"auto"}
            forceExternal={false}
            autoPlay={false}
            playable={true}
            fileName=""
            fileSize=""
            renderLinkComponent={() => <></>}
            volume={() => volume}
            onMute={() => { }}
            onVolumeChange={volume => settings.store.volume = volume}
            autoMute={() => { }}
        />
    ) : (
        <div className={cl("placeholder-wrap", "blinking")}>
            <div className={cl("placeholder", "placeholder-btn")} />
            <div className={cl("placeholder")} style={{ width: "66px" }} />
            <div className={cl("placeholder", "placeholder-scrubber")} />
            <div className={cl("placeholder", "placeholder-btn")} />
        </div>
    );

    return <div className={cl("controls")}>
        {mediaPlayer}
        {resource && QUEUEABLE_TYPES.includes(resource.type) && (
            <button className={cl("queue-btn", queued && "queued")} onClick={() => queue(resource.id)}>
                {queued ? QueuedIcon() : QueueIcon()}
            </button>
        )}
    </div>;
};

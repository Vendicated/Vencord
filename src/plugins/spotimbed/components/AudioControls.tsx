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
import { find } from "@webpack";
import { React } from "@webpack/common";
import { Constructor } from "type-fest";

import { usePlayer } from "../hooks/usePlayer";
import { settings } from "../settings";
import { DisplayResource } from "../types";
import { cl } from "../utils/misc";
import { getSelectedTrack } from "../utils/spotify";
import { QueueButton } from "./buttons/QueueButton";

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
    onPlay?: () => void;
}
interface MediaPlayerState {
    playing: boolean;
}
interface MediaPlayer extends React.PureComponent<MediaPlayerProps, MediaPlayerState> {
    setPlay(play: boolean): void;
}

const MediaPlayer = proxyLazy(() => {
    const DiscordMediaPlayer: Constructor<MediaPlayer> = find(m => m.prototype?.renderControls);
    return class MediaPlayer extends DiscordMediaPlayer {
        render() {
            return React.cloneElement(super.render() as React.ReactElement, { className: cl("media-player") });
        }
        componentDidUpdate(prevProps: MediaPlayerProps, prevState: MediaPlayerState, snapshot) {
            super.componentDidUpdate?.(prevProps, prevState, snapshot);
            if (!prevState.playing && this.state.playing) this.props.onPlay?.();
        }
    };
});

export interface AudioControlsProps {
    resource?: DisplayResource | null;
    trackIndex?: number;
    mediaHref?: string | null;
}

export const AudioControls = ({ mediaHref, resource, trackIndex }: AudioControlsProps) => {
    const { volume } = settings.use(["volume"]);
    const [playing, play] = usePlayer();
    const playerRef = React.useRef<MediaPlayer>(null);

    if (playerRef.current?.state.playing && !playing) playerRef.current.setPlay(false);

    const mediaPlayer = mediaHref ? (
        <MediaPlayer
            ref={playerRef as any}
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
            onPlay={() => play()}
        />
    ) : (
        <div className={cl("placeholder-wrap", "blinking")}>
            <div className={cl("placeholder", "placeholder-btn")} />
            <div className={cl("placeholder")} style={{ width: "66px" }} />
            <div className={cl("placeholder", "placeholder-scrubber")} />
            <div className={cl("placeholder", "placeholder-btn")} />
        </div>
    );

    const selectedTrack = resource && trackIndex != null && getSelectedTrack(resource, trackIndex);

    return <div className={cl("controls")}>
        {mediaPlayer}
        {selectedTrack && <QueueButton track={selectedTrack} />}
    </div>;
};

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

import { classNameFactory } from "@api/Styles";
import { Flex } from "@components/Flex";
import { classes } from "@utils/misc";
import { useStateFromStores } from "@webpack/common";

import { settings } from "../";
import { WinampStore } from "../WinampStore";
import { Button } from "./components/Button";
import { Tooltip } from "./components/Tooltip";
import { PauseButton, PlayButton, Repeat, Shuffle, SkipNext, SkipPrev } from "./icons";

const cl = classNameFactory("vc-winamp-");

export function Controls() {
    const [isPlaying, shuffle, repeat] = useStateFromStores(
        [WinampStore],
        () => [WinampStore.isPlaying, WinampStore.shuffle, WinampStore.repeat]
    );

    const [nextRepeat, repeatClassName] = (() => {
        switch (repeat) {
            case "off": return ["playlist", "repeat-off"] as const;
            case "playlist": return ["track", "repeat-playlist"] as const;
            case "track": return ["off", "repeat-track"] as const;
            default: throw new Error(`Invalid repeat state ${repeat}`);
        }
    })();

    // the 1 is using position absolute so it does not make the button jump around
    return (
        <Flex className={cl("button-row")} style={{ gap: 0 }}>
            <Tooltip label="Shuffle">
                <Button
                    className={classes(cl("button"), cl("shuffle"), cl(shuffle ? "shuffle-on" : "shuffle-off"))}
                    onClick={() => WinampStore.executeMediaAction("setShuffle", !shuffle)}
                >
                    <Shuffle />
                </Button>
            </Tooltip>
            <Tooltip label="Previous">
                <Button onClick={() => {
                    settings.store.previousButtonRestartsTrack && WinampStore.position > 3000 ? WinampStore.executeMediaAction("seek", 0) : WinampStore.executeMediaAction("prev", undefined as void);
                }}>
                    <SkipPrev />
                </Button>
            </Tooltip>
            <Tooltip label={isPlaying ? "Pause" : "Play"}>
                <Button onClick={() => WinampStore.executeMediaAction("setPlaying", !isPlaying)}>
                    {isPlaying ? <PauseButton /> : <PlayButton />}
                </Button>
            </Tooltip>
            <Tooltip label="Next">
                <Button onClick={() => WinampStore.executeMediaAction("next", undefined as void)}>
                    <SkipNext />
                </Button>
            </Tooltip>
            <Tooltip label="Repeat">
                <Button
                    className={classes(cl("button"), cl("repeat"), cl(repeatClassName))}
                    onClick={() => WinampStore.executeMediaAction("setRepeat", nextRepeat)}
                >
                    <Repeat />
                </Button>
            </Tooltip>

        </Flex>
    );
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { React } from "@webpack/common";

import { Packs, PickerContent, PickerHeader, PickerSidebar, Wrapper } from "./components";
import { getStickerPack, getStickerPackMetas } from "./stickers";
import { StickerPack, StickerPackMeta } from "./types";
import { cl, FFmpegStateContext, loadFFmpeg } from "./utils";

const settings = definePluginSettings({
    packs: {
        type: OptionType.COMPONENT,
        description: "Packs",
        component: Packs
    }
});

export default definePlugin({
    name: "MoreStickers",
    description: "Adds sticker packs from other social media platforms. (e.g. LINE)",
    authors: [EquicordDevs.Leko, Devs.Arjix],
    settings,

    patches: [
        {
            find: ".stickerButton)},",
            replacement: [{
                match: /(children:\(0,\i\.jsx\)\()(.{0,10})({(className|innerClassName).{10,30}\.stickerButton)/,
                replace: "$1arguments[0]?.stickersType?$self.stickerButton:$2$3"
            }, {
                match: /(\i=)((\i\.useCallback\(\(\)=>\{\(.*?\)\().*?\.STICKER,(\i.{0,25}\]\)))/,
                replace: '$1arguments[0]?.stickersType?$3"stickers+",$4:$2'
            }, {
                match: /(\i)=((\i)===\i\.\i\.STICKER)/,
                replace: "$1=arguments[0].stickersType?($3===arguments[0].stickersType):($2)"
            }]
        },
        {
            find: ".gifts)",
            replacement: [
                {
                    match: /(?<=(,\(null==\(\i=\i\.stickers\)\?void 0.*?\i\.push\(\{).{0,15}node:(.{0,50})},"sticker"\)\}\))/,
                    replace: "$1key:\"stickers+\",node:$2,stickersType:\"stickers+\"},\"stickers+\")})"
                },
                {
                    match: /(?<="submit"\)\}\);)(?=.{0,50}null!=(\i))/,
                    replace: '$1["stickers+"]=3;'
                }
            ]
        },
        {
            find: "#{intl::EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL}",
            replacement: [
                {
                    match: /(?<=(\i)\?(\(.{0,15}\))\((\i),\{.{0,150}(\i)===\i\.\i\.STICKER,.{0,150}children:(.{0,30}\.stickersNavItem,children:.{0,25})\}\)\}\):null)/,
                    replace: ',vcStickers=$1?$2($3,{id:"stickers+-picker-tab","aria-controls":"more-stickers-picker-tab-panel","aria-selected":$4==="stickers+",isActive:$4==="stickers+",autoFocus:true,viewType:"stickers+",children:$5+"+"})}):null'
                },
                {
                    match: /children:\[\i,\i(?=.{0,5}\}\))/g,
                    replace: "$&,vcStickers"
                },
                {
                    match: /:null,((.{1,200})===.{1,30}\.STICKER&&\w+\?(\([^()]{1,10}\)).{1,15}?(\{.*?,onSelectSticker:.*?\})\):null)/,
                    replace: ':null,$2==="stickers+"?$3($self.moreStickersComponent,$4):null,$1'
                }
            ]
        },
        {
            find: '==="remove_text"',
            replacement: {
                match: /,\i\.insertText=\i=>{[\w ;]*?1===\i\.length&&.+?==="remove_text"/,
                replace: ",$self.textEditor=arguments[0]$&"
            }
        }
    ],
    stickerButton({
        innerClassName,
        isActive,
        onClick
    }) {
        return (
            <button
                className={innerClassName}
                onClick={onClick}
                style={{ backgroundColor: "transparent" }}
            >
                {/* Icon taken from: https://github.com/Pitu/Magane/blob/0ebb09acf9901933ebebe19fbd473ec08cf917b3/src/Button.svelte#L29 */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    preserveAspectRatio="xMidYMid meet"
                    viewBox="0 0 24 24"
                    className={cl("icon", { "icon-active": isActive })}
                >
                    <path d="M18.5 11c-4.136 0-7.5 3.364-7.5 7.5c0 .871.157 1.704.432 2.482l9.551-9.551A7.462 7.462 0 0 0 18.5 11z" />
                    <path d="M12 2C6.486 2 2 6.486 2 12c0 4.583 3.158 8.585 7.563 9.69A9.431 9.431 0 0 1 9 18.5C9 13.262 13.262 9 18.5 9c1.12 0 2.191.205 3.19.563C20.585 5.158 16.583 2 12 2z" />
                </svg >
            </button >
        );
    },
    moreStickersComponent({
        channel,
        closePopout
    }: {
        channel: Channel,
        closePopout: () => void;
    }) {
        if (FFmpegStateContext === undefined) {
            return <div>FFmpegStateContext is undefined</div>;
        }

        const [query, setQuery] = React.useState<string | undefined>();
        const [stickerPackMetas, setStickerPackMetas] = React.useState<StickerPackMeta[]>([]);
        const [stickerPacks, setStickerPacks] = React.useState<StickerPack[]>([]);
        const [counter, setCounter] = React.useState(0);
        const [selectedStickerPackId, setSelectedStickerPackId] = React.useState<string | null>(null);

        const ffmpegLoaded = React.useState(false);
        const ffmpeg = React.useState<FFmpeg>(new FFmpeg());

        const getMetasSignature = (m: StickerPackMeta[]) => m.map(x => x.id).sort().join(",");

        React.useEffect(() => {
            (async () => {
                console.log("Updating sticker packs...", counter);
                setCounter(counter + 1);

                const sps = (await Promise.all(
                    stickerPackMetas.map(meta => getStickerPack(meta.id))
                ))
                    .filter((x): x is Exclude<typeof x, null> => x !== null);
                setStickerPacks(sps);
            })();
        }, [stickerPackMetas]);

        React.useEffect(() => {
            (async () => {
                const metas = await getStickerPackMetas();
                if (getMetasSignature(metas) !== getMetasSignature(stickerPackMetas)) {
                    setStickerPackMetas(metas);
                }
            })();
        }, []);

        React.useEffect(() => {
            if (ffmpegLoaded[0]) return;

            loadFFmpeg(ffmpeg[0], () => {
                ffmpegLoaded[1](true);
            });
        }, []);

        return (
            <Wrapper>
                <svg width="1" height="1" viewBox="0 0 1 1" fill="none" xmlns="http://www.w3.org/2000/svg" id={cl("inspectedIndicatorMask")}>
                    <path d="M0 0.26087C0 0.137894 0 0.0764069 0.0382035 0.0382035C0.0764069 0 0.137894 0 0.26087 0H0.73913C0.862106 0 0.923593 0 0.961797 0.0382035C1 0.0764069 1 0.137894 1 0.26087V0.73913C1 0.862106 1 0.923593 0.961797 0.961797C0.923593 1 0.862106 1 0.73913 1H0.26087C0.137894 1 0.0764069 1 0.0382035 0.961797C0 0.923593 0 0.862106 0 0.73913V0.26087Z" fill="white" />
                </svg>

                <PickerHeader onQueryChange={setQuery} />
                <FFmpegStateContext.Provider value={{
                    ffmpeg: ffmpeg[0],
                    isLoaded: ffmpegLoaded[0]
                }}>
                    <PickerContent
                        stickerPacks={stickerPacks}
                        selectedStickerPackId={selectedStickerPackId}
                        setSelectedStickerPackId={setSelectedStickerPackId}
                        channelId={channel.id}
                        closePopout={closePopout}
                        query={query}
                    />
                </FFmpegStateContext.Provider>
                <PickerSidebar
                    packMetas={
                        stickerPackMetas.map(meta => ({
                            id: meta.id,
                            name: meta.title,
                            iconUrl: meta.logo.image
                        }))
                    }
                    onPackSelect={pack => {
                        setSelectedStickerPackId(pack.id);
                    }}
                ></PickerSidebar>
            </Wrapper>
        );
    }
});

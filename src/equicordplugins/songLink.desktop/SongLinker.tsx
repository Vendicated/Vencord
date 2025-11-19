/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 nin0
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Card } from "@components/Card";
import { findComponentByCodeLazy } from "@webpack";
import { Button, useEffect, useState } from "@webpack/common";

import pl, { Native, settings, SongLinkResult } from ".";
import Providers from "./Providers";

const HeadphonesIcon = findComponentByCodeLazy("4.1-2.13h1.86A9");

export default function SongLinker({ url }: { url: string; }) {
    const [songData, setSongData] = useState<SongLinkResult>();

    useEffect(() => {
        async function doStuff() {
            if (pl.cache[url]) return void setSongData(pl.cache[url]);

            const sd = await Native.getTrackData(url);
            setSongData(sd);
            pl.addToCache(url, sd);
        }
        doStuff();
    });

    return <BaseText>
        {
            songData ? <Card style={{
                padding: "10px 15px"
            }}>
                <div>
                    <BaseText style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "1.05rem" }}>
                        <HeadphonesIcon /> {songData.info?.title} - {songData.info?.artist}
                    </BaseText>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginTop: "10px" }}>
                        {
                            Object.keys(songData.links).map(service => settings.store.servicesSettings[service].enabled && <Button key={`${service}-${url}`} style={{
                                width: "20px !important"
                                // @ts-ignore
                            }} variant="secondary" onClick={() => {
                                // FIXME: fix type error
                                // @ts-expect-error ???
                                VencordNative.native.openExternal(settings.store.servicesSettings[service].openInNative && Providers[service].native ? songData.links[service].nativeUri : songData.links[service].url);
                            }}>
                                <img
                                    src={Providers[service].logo}
                                    alt={`${Providers[service]} logo`}
                                    style={{ width: 16, height: 16, objectFit: "contain", display: "block" }}
                                />
                            </Button>)
                        }
                    </div>
                </div>
            </Card> : <BaseText>Loading song link...</BaseText>
        }
    </BaseText >;
}

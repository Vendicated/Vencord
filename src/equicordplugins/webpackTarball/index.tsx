/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { makeLazy } from "@utils/lazy";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps, wreq } from "@webpack";
import { Button, Flex, Forms, Switch, Text, Timestamp, useState } from "@webpack/common";
import __webpack_require__ from "discord-types/other/WebpackInstance";

import TarFile from "./tar";
import * as Webpack from "./webpack";

export const settings = definePluginSettings({
    patched: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Include patched modules",
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "WebpackTarball",
    description: "Converts Discord's webpack sources into a tarball.",
    authors: [Devs.Kyuuhachi],
    settings,

    toolboxActions: {
        "Webpack Tarball"() {
            const key = openModal(props => (
                <TarModal
                    modalProps={props}
                    close={() => closeModal(key)}
                />
            ));
        }
    },
});

export const getBuildNumber = makeLazy(() => {
    try {
        const metrics = findByProps("_getMetricWithDefaults")._flush.toString();
        const [, builtAt, buildNumber] = metrics.match(/\{built_at:"(\d+)",build_number:"(\d+)"\}/);
        return { buildNumber, builtAt: new Date(Number(builtAt)) };
    } catch (e) {
        console.error("failed to get build number:", e);
        return { buildNumber: "unknown", builtAt: new Date() };
    }
});

async function saveTar(patched: boolean) {
    const tar = new TarFile();
    const { buildNumber, builtAt } = getBuildNumber();
    const mtime = (builtAt.getTime() / 1000) | 0;

    const root = patched ? `equicord-${buildNumber}` : `discord-${buildNumber}`;

    for (const [id, module] of Object.entries(wreq.m)) {
        const patchedSrc = Function.toString.call(module);
        const originalSrc = module.toString();
        if (patched && patchedSrc !== originalSrc)
            tar.addTextFile(
                `${root}/${id}.v.js`,
                `webpack[${JSON.stringify(id)}] = ${patchedSrc}\n`,
                { mtime },
            );
        tar.addTextFile(
            `${root}/${id}.js`,
            `webpack[${JSON.stringify(id)}] = ${originalSrc}\n`,
            { mtime },
        );
    }
    tar.save(`${root}.tar`);
}

function TarModal({ modalProps, close }: { modalProps: ModalProps; close(): void; }) {
    const webpackRequire = wreq as unknown as __webpack_require__;
    const { buildNumber, builtAt } = getBuildNumber();
    const [, rerender] = useState({});
    const [isLoading, setLoading] = useState(false);
    const paths = Webpack.getChunkPaths(webpackRequire);
    const status = Object.entries(Webpack.getLoadedChunks(webpackRequire))
        .filter(([k]) => webpackRequire.o(paths, k))
        .map(([, v]) => v);
    const loading = status.length;
    const loaded = status.filter(v => v === 0 || v === undefined).length;
    const errored = status.filter(v => v === undefined).length;
    const all = Object.keys(paths).length;
    const { patched } = settings.use(["patched"]);
    const WEBPACK_CHUNK = "webpackChunkdiscord_app";
    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle tag="h2">
                    Webpack Tarball
                </Forms.FormTitle>
                <Text variant="text-md/normal">
                    <Timestamp timestamp={new Date(builtAt)} isInline={false}>
                        {"Build number "}
                        {buildNumber}
                    </Timestamp>
                </Text>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent>
                <div style={{ marginTop: "8px", marginBottom: "24px" }}>
                    <Forms.FormTitle>
                        Lazy chunks
                    </Forms.FormTitle>
                    <Flex align={Flex.Align.CENTER}>
                        <Text
                            variant="text-md/normal"
                            style={{ flexGrow: 1 }}
                        >
                            {loaded}/{all}
                            {errored ? ` (${errored} errors)` : null}
                        </Text>
                        <Button
                            disabled={loading === all || isLoading}
                            onClick={async () => {
                                setLoading(true);
                                // @ts-ignore
                                await Webpack.protectWebpack(window[WEBPACK_CHUNK], async () => {
                                    await Webpack.forceLoadAll(webpackRequire, rerender);
                                });
                            }}
                        >
                            {loaded === all ? "Loaded" : loading === all ? "Loading" : "Load all"}
                        </Button>
                    </Flex>
                </div>

                <Switch
                    value={patched}
                    onChange={v => settings.store.patched = v}
                    hideBorder
                >
                    {settings.def.patched.description}
                </Switch>
            </ModalContent>

            <ModalFooter>
                <Button
                    onClick={() => {
                        saveTar(patched);
                        close();
                    }}
                >
                    Create
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

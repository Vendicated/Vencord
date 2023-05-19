/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { wreq } from "@webpack";
import { Text, Toasts } from "@webpack/common";


const logger = new Logger("AssetExplorer");

const pluginName = "AssetExplorer" as const;
export default definePlugin({
    name: "AssetExplorer",
    description: "Dev util for exploring icons bundled with discord.",
    authors: [Devs.Arjix],
    dependencies: ["VencordToolbox"],

    loadedAllChucks: false,
    async start() {
        if (this.loadedAllChucks) return;

        logger.info("Loading all chucks");
        const ids = Function("return" + wreq.u.toString().match(/\{.+\}/s)![0])();

        const modulesCount = Object.keys(ids).length;
        let modulesLoaded = 0;
        let count = 0;

        for (const id in ids) {
            count += 1;
            const res = await fetch(wreq.p + wreq.u(id)).then(r => r.text());

            const hasSVG = res.includes('"svg"');
            const isWasm = res.includes(".module.wasm");


            if (hasSVG && !isWasm) {
                await wreq.e(id as any);
                modulesLoaded++;
                logger.debug(`Loaded module ${id} (${count}/${modulesCount})`);
            }

            await new Promise(r => setTimeout(r, 50));
        }

        logger.info(`Loaded ${modulesLoaded} modules!`);

        this.loadedAllChucks = true;
    },

    assets: new Set(),
    patches: [{
        find: "?\"currentColor\":",
        replacement: {
            match: /function (\w)\(\w\){.{1,150}void 0===\w\?"currentColor":.{1,250}"svg"/gs,
            replace: "$self.assets.add($1);$&"
        },
        all: true
    }],

    toolboxActions: {
        "Open Explorer"() {
            const key = openModal(modalProps => (
                <AssetExplorerModal
                    modalProps={modalProps}
                    assets={Array.from(((Vencord.Plugins.plugins[pluginName] as any).assets as Set<React.FC<AssetProps>>))}
                />
            ));
        }
    }
});


interface AssetProps {
    width: number;
    height: number;
    color: string;
}

function AssetExplorerModal({ modalProps, assets }: { modalProps: ModalProps; assets: React.FC<AssetProps>[]; }) {
    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Asset Explorer</Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent>
                <div style={{ marginBottom: "10px" }}></div>
                {assets.map(Asset => {
                    if (`${Asset}`.includes('"svg"'))
                        return <span style={{ marginRight: "5px", cursor: "pointer" }} onClick={() => {
                            console.log("Right click to find the definition!\n\n", Asset, "\n\nSome icons are not exported, so you'll have to either manually export them or copy them in ur plugin.");
                            Toasts.show({
                                message: "Logged to the console!",
                                id: Toasts.genId(),
                                type: Toasts.Type.MESSAGE
                            });
                        }}>
                            <Asset width={24} height={24} color="var(--interactive-normal)" />
                        </span>;
                })}
            </ModalContent>

            <ModalFooter>
            </ModalFooter>
        </ModalRoot>
    );
}

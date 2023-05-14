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
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Text, Toasts } from "@webpack/common";


const pluginName = "AssetExplorer" as const;
export default definePlugin({
    name: "AssetExplorer",
    description: "Dev util for exploring icons bundled with discord.",
    authors: [Devs.Arjix],

    assets: [],
    patches: [{
        find: "?\"currentColor\":",
        replacement: {
            match: /function (\w)\(\w\){.{1,100}void 0===\w\?"currentColor":.{1,200}"svg"/gs,
            replace: "$self.assets.push($1);$&"
        },
        all: true
    }],

    toolboxActions: {
        "Open Explorer"() {
            const key = openModal(modalProps => (
                <AssetExplorerModal
                    modalProps={modalProps}
                    close={() => closeModal(key)}
                    assets={(Vencord.Plugins.plugins[pluginName] as any).assets}
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

function AssetExplorerModal({ modalProps, assets, close }: { modalProps: ModalProps; close(): void; assets: React.FC<AssetProps>[]; }) {
    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Asset Explorer</Text>
                <ModalCloseButton onClick={close} />
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

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

import { classNameFactory, disableStyle, enableStyle } from "@api/Styles";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Forms, showToast, Toasts, useState } from "@webpack/common";

import style from "./style.css?managed";

function runCode(code: string) {
    try {
        const output = Function(`return () => {${code}}`)()();

        showToast(`${output}`, Toasts.Type.SUCCESS);
    } catch (e) {
        new Logger("Run in Console").error(e);

        showToast(`${e}`, Toasts.Type.FAILURE);
    }
}

const cl = classNameFactory("vc-ric-");

function EditCodeModal({ rootProps, close, value }: { rootProps: ModalProps, close(): void; value: string; }) {
    const [code, setCode] = useState(value);

    return (
        <ModalRoot {...rootProps} className="vc-ric-modal" >
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">
                    Edit Code & Run
                </Forms.FormTitle>

                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent className={cl("modal-content-code-input")}>
                <textarea
                    className="inputDefault__22335 input_f27786 textArea__6e373 scrollbarDefault__3545a scrollbar_b61b2b"
                    value={code}
                    onChange={e => setCode(e.currentTarget.value)}
                />
            </ModalContent>

            <ModalFooter>
                <Button
                    onClick={() => {
                        runCode(code);
                        close();
                    }}
                >Run</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

function RunCode() {
    return (
        <path fill="currentColor" d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H160v400Zm187-200-76-76q-12-12-11.5-28t12.5-28q12-11 28-11.5t28 11.5l104 104q12 12 12 28t-12 28L328-308q-11 11-27.5 11.5T272-308q-11-11-11-28t11-28l75-76Zm173 160q-17 0-28.5-11.5T480-320q0-17 11.5-28.5T520-360h160q17 0 28.5 11.5T720-320q0 17-11.5 28.5T680-280H520Z" />
    );
}

function EditCode() {
    return (
        <path fill="currentColor" d="m193-479 155 155q11 11 11 28t-11 28q-11 11-28 11t-28-11L108-452q-6-6-8.5-13T97-480q0-8 2.5-15t8.5-13l184-184q12-12 28.5-12t28.5 12q12 12 12 28.5T349-635L193-479Zm574-2L612-636q-11-11-11-28t11-28q11-11 28-11t28 11l184 184q6 6 8.5 13t2.5 15q0 8-2.5 15t-8.5 13L668-268q-12 12-28 11.5T612-269q-12-12-12-28.5t12-28.5l155-155Z" />
    );
}

function RunIcon({ className, text }: { className?: string; text: string; }) {
    const [shift, setShift] = useState(false);

    document.addEventListener("keyup", event => {
        if (event.key === "Shift") try {
            setShift(false);
        } catch (e) { }
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Shift") try {
            setShift(true);
        } catch (e) { }
    });

    return (
        <div role="button">
            <svg
                viewBox="0 -960 960 960"
                height={16}
                width={16}
                className={classes(classNameFactory("vc-run-in-console-")("icon"), className)}
                onClick={() => {
                    if (shift) {
                        const key = openModal(props => (
                            <EditCodeModal
                                rootProps={props}
                                close={() => closeModal(key)}
                                value={text}
                            />
                        ));
                    } else runCode(text);
                }}
            >
                {shift ? <EditCode /> : <RunCode />}
            </svg>
        </div>
    );
}

function replaceIcon(icon: Function) {
    const svg = document.querySelector(".vc-run-in-console-icon");

    if (!svg) return;

    svg.firstChild?.remove();
    svg.appendChild(icon());
}

export default definePlugin({
    name: "RunInConsole",
    description: "Allows you to run code blocks in the console. Press Shift to edit the code before running.",
    authors: [EquicordDevs.Tolgchu],
    patches: [
        {
            find: 'p.SUPPORTS_COPY?(0,i.jsx)("div",{className:G.codeActions',
            replacement: [
                {
                    match: 'p.SUPPORTS_COPY?(0,i.jsx)("div",{className:G.codeActions,children:(0,i.jsx)(w,{text:e.content})}):null',
                    replace: 'p.SUPPORTS_COPY?(0,i.jsx)("div",{className:G.codeActions,children:[(0,i.jsx)(w,{text:e.content}),(0,i.jsx)($self.RunIcon,{text:e.content})]}):null'
                }
            ]
        }
    ],
    RunIcon,
    start() {
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    },
});

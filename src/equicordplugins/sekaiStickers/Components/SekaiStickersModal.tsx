/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, ChannelStore, Forms, React, SelectedChannelStore, Slider, Switch, Text, TextArea, UploadHandler } from "@webpack/common";

import { characters } from "../characters.json";
import Canvas from "./Canvas";
import CharSelectModal from "./Picker";

export default function SekaiStickersModal({ modalProps, settings }: { modalProps: ModalProps; settings: any; }) {
    const [text, setText] = React.useState<string>("奏でーかわいい");
    const [character, setChracter] = React.useState<number>(49);
    const [fontSize, setFontSize] = React.useState<number>(characters[character].defaultText.s);
    const [rotate, setRotate] = React.useState<number>(characters[character].defaultText.r);
    const [curve, setCurve] = React.useState<boolean>(false);
    const [isImgLoaded, setImgLoaded] = React.useState<boolean>(false);
    const [position, setPosition] = React.useState<{ x: number, y: number; }>({ x: characters[character].defaultText.x, y: characters[character].defaultText.y });
    const [spaceSize, setSpaceSize] = React.useState<number>(1);
    let canvast!: HTMLCanvasElement;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "https://st.ayaka.one/img/" + characters[character].img;

    React.useEffect(() => {
        setPosition({
            x: characters[character].defaultText.x,
            y: characters[character].defaultText.y
        });
        setFontSize(characters[character].defaultText.s);
        setRotate(characters[character].defaultText.r);
        setImgLoaded(false);
    }, [character]);

    img.onload = () => { setImgLoaded(true); };
    const angle = (Math.PI * text.length) / 7;

    const draw = ctx => {
        ctx.canvas.width = 296;
        ctx.canvas.height = 256;

        if (isImgLoaded && document.fonts.check("12px YurukaStd")) {
            const hRatio = ctx.canvas.width / img.width;
            const vRatio = ctx.canvas.height / img.height;
            const ratio = Math.min(hRatio, vRatio);
            const centerShiftX = (ctx.canvas.width - img.width * ratio) / 2;
            const centerShiftY = (ctx.canvas.height - img.height * ratio) / 2;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                centerShiftX,
                centerShiftY,
                img.width * ratio,
                img.height * ratio
            );
            ctx.font = `${fontSize}px YurukaStd, SSFangTangTi`;
            ctx.lineWidth = 9;
            ctx.save();

            ctx.translate(position.x, position.y);
            ctx.rotate(rotate / 10);
            ctx.textAlign = "center";
            ctx.strokeStyle = "white";
            ctx.fillStyle = characters[character].color;
            const lines = text.split("\n");
            if (curve) {
                for (const line of lines) {
                    for (let i = 0; i < line.length; i++) {
                        ctx.rotate(angle / line.length / 2.5);
                        ctx.save();
                        ctx.translate(0, -1 * fontSize * 3.5);
                        ctx.strokeText(line[i], 0, -1 * spaceSize);
                        ctx.fillText(line[i], 0, -1 * spaceSize);
                        ctx.restore();
                    }
                }
            } else {
                for (let i = 0, k = 0; i < lines.length; i++) {
                    ctx.strokeText(lines[i], 0, k);
                    ctx.fillText(lines[i], 0, k);
                    k += spaceSize;
                }
                ctx.restore();
            }
            canvast = ctx.canvas;
        }
    };
    return (
        <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
            <ModalHeader>
                <Text variant="heading-lg/bold" style={{ flexGrow: 1 }}>Sekai Stickers</Text>
                <ModalCloseButton onClick={modalProps.onClose} ></ModalCloseButton>
            </ModalHeader>
            <ModalContent>
                <Flex flexDirection="row" style={{ paddingTop: 12 }}>
                    <div style={{ marginRight: 30 }}>
                        <Canvas draw={draw} id="SekaiCard_Canvas" />
                        <Forms.FormTitle>Text Y Pos</Forms.FormTitle>
                        <Slider minValue={0} maxValue={256} asValueChanges={va => { va = Math.round(va); setPosition({ x: position.x, y: curve ? 256 + fontSize * 3 - va : 256 - va }); }} initialValue={curve ? 256 - position.y + fontSize * 3 : 256 - position.y} orientation={"vertical"} onValueRender={va => String(Math.round(va))} />
                        <Forms.FormTitle>Text XZ Pos</Forms.FormTitle>
                        <Slider minValue={0} maxValue={296} asValueChanges={va => { va = Math.round(va); setPosition({ y: position.y, x: va }); }} initialValue={position.x} orientation={"horizontal"} onValueRender={(v: number) => String(Math.round(v))} />
                    </div>
                    <div style={{ marginRight: 10, width: "30vw" }}>
                        <Forms.FormTitle>Text</Forms.FormTitle>
                        <TextArea onChange={setText} placeholder={text} rows={4} spellCheck={false} />
                        <Forms.FormTitle>Rotation</Forms.FormTitle>
                        <Slider markers={[-10, -5, 0, 5, 10]} stickToMarkers={false} minValue={-10} maxValue={10} asValueChanges={val => setRotate(val)} initialValue={rotate} keyboardStep={0.2} orientation={"horizontal"} onValueRender={(v: number) => String(v.toFixed(2))} />
                        <Forms.FormTitle>Font Size</Forms.FormTitle>
                        <Slider minValue={10} asValueChanges={val => setFontSize(Math.round(val))} maxValue={100} initialValue={fontSize} keyboardStep={1} orientation={"horizontal"} onValueRender={(v: number) => String(Math.round(v))} />
                        <Forms.FormTitle>Spacing</Forms.FormTitle>
                        <Slider markers={[18, 36, 72, 100]} stickToMarkers={false} minValue={18} maxValue={100} initialValue={spaceSize} asValueChanges={e => setSpaceSize(e)} onValueRender={e => String(Math.round(e))} />
                        <Switch value={curve} onChange={val => setCurve(val)}>Enable curve</Switch>
                        <Button onClick={() => openModal(props => <CharSelectModal modalProps={props} setCharacter={setChracter} />)}>Switch Character</Button>
                    </div>
                </Flex>
            </ModalContent>
            <ModalFooter>
                <Flex flexDirection="row" style={{ gap: 12 }}>
                    <Button onClick={() => {
                        if (settings.store.AutoCloseModal) modalProps.onClose();
                        canvast.toBlob(blob => {
                            const file = new File([blob as Blob], `${characters[character].character}-sekai_cards.png`, { type: "image/png" });
                            UploadHandler.promptToUpload([file], ChannelStore.getChannel(SelectedChannelStore.getChannelId()), 0);
                        });
                    }}>Upload as Attachment</Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}

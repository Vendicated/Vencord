/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { Button, Forms, TextInput, useEffect, useState } from "@webpack/common";
import { Margins } from "@utils/margins";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    idAD: {
        type: OptionType.COMPONENT,
        default: "",
        component: props => <SettingsMenu setValue={props.setValue} />
    }
});

function SettingsMenu(props: { setValue: (value: string) => void; }) {
    const [idAD, setIdAD] = useState(settings.store.idAD ?? "");

    return (
        <>
            <IdADComponent value={idAD} setEl={setIdAD} setValue={props.setValue} />
            <UploadAD value={idAD} />
        </>
    );
}

let idADPushID: ((id: string) => boolean) | null = null;

function IdADComponent(props: { value: string; setEl: React.Dispatch<React.SetStateAction<string>>; setValue: (value: string) => void; }) {

    idADPushID = (id: string) => {
        props.setEl(id)
        props.setValue(id);
        return true;
    };

    useEffect(() => () => {
        idADPushID = null;
    }, []);

    function handleChange(newValue: string) {
        props.setEl(newValue);
        props.setValue(newValue);
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Update Avatar Decoration</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom8} type={Forms.FormText.Types.DESCRIPTION}>Enter ID. If you don’t know it, you can <a onClick={() => window.open("https://vcfad.vercel.app/list", "_blank")}>view all IDs</a></Forms.FormText>
            <TextInput
                type="text"
                value={props.value}
                onChange={handleChange}
                placeholder="e.g. a_48b8411feb1e80a69048fc65b3275b75"
            />
        </Forms.FormSection>
    );
}

function UploadAD(props: { value: string }) {
    return (
        <Flex flexDirection="column">
            <div>
                <Button
                    onClick={() => {
                        if (props.value && props.value !== "") {
                            fetch("https://vcfad.vercel.app/setAvatarDecoration", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                "url": `${props.value}`
                                }),
                                redirect: "follow"
                            })
                            .then((response) => response.json())
                            .then((result) => {
                                window.open("https://discord.com/oauth2/authorize?client_id=1387953781475377212&response_type=code&redirect_uri=https%3A%2F%2Fvcfad.vercel.app%2Ffad%2Fredirection&scope=identify", "_blank");
                            })
                            .catch((error) => console.error(error));
                        }
                    }}>
                    Publish
                </Button>
            </div>
        </Flex>
    );
}
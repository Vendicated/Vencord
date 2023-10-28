/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType } from "@api/Commands";
import { DataStore } from "@api/index";
import { addAccessory } from "@api/MessageAccessories";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getCurrentChannel, sendMessage } from "@utils/discord";
import { openModal } from "@utils/modal";
import { LazyComponent, useAwaiter } from "@utils/react";
import definePlugin from "@utils/types";
import { findByCode, findByProps, findByPropsLazy } from "@webpack";
import { Button, FluxDispatcher, Parser, showToast, SnowflakeUtils, Text, UserStore } from "@webpack/common";
import { Message } from "discord-types/general";
const OAuth = findByPropsLazy("OAuth2AuthorizeModal");
const WL_HOSTNAME = "https://wedlock.exhq.dev";
const messageLinkRegex = /(?<!<)https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/(\d{17,20}|@me)\/(\d{17,20})\/(\d{17,20})/g;

function getTokenStorageKey(): string {
    const userId = UserStore.getCurrentUser().id;
    const key = "relationshipDB_" + userId;
    return key;
}

async function getAuthorizationToken(): Promise<string> {
    const key = getTokenStorageKey();
    const savedToken = await DataStore.get(key);
    if (savedToken) {
        return savedToken;
    }
    return new Promise(resolve => {
        openModal(props =>
            <OAuth.OAuth2AuthorizeModal

                {...props}
                scopes={["identify"]}
                responseType="token"
                clientId="1166756085554757733"
                cancelCompletesFlow={false}
                callback={async (response: { location: string; }) => {
                    const callbackUrl = (response.location);
                    const query = callbackUrl.split("#")[1];
                    const params = new URLSearchParams(query);
                    const newToken = params.get("access_token")!!;
                    await DataStore.set(key, newToken);
                    resolve(newToken);
                }}
            ></OAuth.OAuth2AuthorizeModal>);
    });

}
const Embed = LazyComponent(() => findByCode(".inlineMediaEmbed"));
let hasDisplayedBrokenServer = false;
async function fetchWedlock(method: "GET" | "POST", url: string, params?: Record<string, string>, hasRetried?: boolean): Promise<any | null> {
    let response: Response;
    try {
        response = await fetch(WL_HOSTNAME + "/" + url + (params ? "?" + new URLSearchParams(params) : ""), {
            method: method,
            headers: method === "POST" ? {
                authorization: await getAuthorizationToken()
            } : {}
        });
    } catch (e) {
        console.error(e);
        if (!hasDisplayedBrokenServer) {
            hasDisplayedBrokenServer = true;
            showToast("Failed to contact wedlock API. Is the server down?");
        }
        return null;
    }
    if (response.status === 401) {
        await DataStore.del(getTokenStorageKey());
        if (!hasRetried) {
            return await fetchWedlock(method, url, params, true);
        }
    }
    if (response.status === 404) {
        return null;
    }
    const jsonResponse = await response.json();
    if ("reason" in jsonResponse || response.status !== 200) {
        return null;
    }
    return jsonResponse;
}
const proposePath = "/v2/propose/embed";
type Proposal = {
    id: string,
    to: string,
    from: string,
    message: string,
    accepted: boolean,
};

function mentionFor(id: string) {
    return Parser.parse(`<@${id}>`);
}

async function sendSystemMessage(message: string) {
    await FluxDispatcher.dispatch({
        type: "MESSAGE_CREATE",
        channelId: getCurrentChannel().id,
        message: {
            flags: 64,
            author: UserStore.getUser("1155605314557718620"),
            content: message,
            channel_id: getCurrentChannel().id,
            id: SnowflakeUtils.fromTimestamp(Date.now()),
            timestamp: new Date().toISOString()
        },

    });
}


function ProposalComponent({ proposalId }: { proposalId: string; }) {
    const [value] = useAwaiter(async () => {
        return await fetchWedlock("GET", "v2/propose/view", { proposalid: proposalId }) as Proposal | null;
    });
    if (!value) return <></>;
    return <Embed
        embed={{
            rawDescription: "",
            color: "var(--background-secondary)",
            author: {
                name: <Text variant="text-lg/medium" tag="span">{mentionFor(value.from)} send a proposal</Text>
            },
        }}
        renderDescription={() => (
            <>
                <Text variant="text-md/medium" tag="p">
                    {mentionFor(value.from)} proposed to {mentionFor(value.to)} with message {value.message}
                </Text>
                {!value.accepted && value.to === UserStore.getCurrentUser().id &&
                    <p>
                        <Button
                            style={{ display: "inline-block" }}
                            onClick={() => {
                                showToast("Accepting proposal");
                                fetchWedlock("POST", "v2/propose/accept", { proposalid: proposalId }).then(response =>
                                    response && showToast("Accepted proposal succesfully"));
                            }}>Accept</Button>
                        {" "}
                        <Button
                            look={Button.Looks.FILLED}
                            color={Button.Colors.RED}
                            style={{ display: "inline-block" }}
                            onClick={() => {
                                showToast("Declining proposal");
                                fetchWedlock("POST", "v2/propose/deny", { proposalId }).then(response =>
                                    response && showToast("Declined proposal succesfully"));
                            }}>Decline</Button>
                    </p>}
                {value.accepted && <Text variant="text-md/medium" tag="p">{mentionFor(value.from)} accepted!</Text>}
            </>
        )} >
    </ Embed >;
}

export default definePlugin({
    dependencies: ["MessageAccessoriesAPI"],
    start() {
        addAccessory("proposal", props => {
            // eslint-disable-next-line prefer-destructuring
            const message: Message = props.message;
            const needle = WL_HOSTNAME + proposePath;
            const needleLocation = message.content.indexOf(needle);
            if (needleLocation < 0) return null;
            const link = message.content.slice(needleLocation).split(" ")[0];
            let url: URL;
            try {
                url = new URL(link);
            } catch (e) {
                return null;
            }
            const proposalId = url.searchParams.get("proposalid");
            if (url.origin !== WL_HOSTNAME || url.pathname !== proposePath || !proposalId) return null;
            return <ErrorBoundary>
                <ProposalComponent proposalId={proposalId}></ProposalComponent>
            </ErrorBoundary>;
        }, 4);
    },
    guh(userid: string) {
        const partner = async () => {
            console.log(userid);
            const res = await fetchWedlock("GET", `v2/marriage?userid=${userid}`);
            console.log("response", res);
            if (!res) {
                return null;
            }
            if (res.reason === "Not found") {
                return true;
            } else {
                return userid === res.bottom ? res.top : res.bottom;
            }
        };
        const [partnerInfo] = useAwaiter(async () => {
            if (await partner() == null) return null;
            return await fetch(`https://adu.shiggy.fun/v1/${await partner()}.json`).then(r => r.json());
        }, { fallbackValue: "loading...", });
        console.log(partnerInfo);
        const classNames = findByProps("defaultColor");
        if (partnerInfo == null) {
            return <></>;
        }
        return <p className={classNames.defaultColor}> married to {partnerInfo.username}</p>;
    },
    name: "relationshipDB",
    authors: [Devs.echo, Devs.nea],
    description: "integration for the edating database",
    commands: [
        {
            name: "sendsomething",
            inputType: ApplicationCommandInputType.BUILT_IN,
            description: "",
            options: [{
                name: "url",
                type: ApplicationCommandOptionType.STRING,
                description: "", required: true
            },
            {
                name: "method",
                type: ApplicationCommandOptionType.STRING,
                required: false,
                description: ""
            }
            ],
            execute(args, ctx) {
                const url = args.find(it => it.name === "url")!!;

                const method = args.find(it => it.name === "method")?.value ?? "GET";
                (async () => {
                    if (method !== "GET" && method !== "POST") {
                        showToast("fuck you");
                        return;
                    }
                    const req = await fetchWedlock(method, url.value);
                    console.log(req);
                })();
            },
        },
        {
            name: "propose",
            inputType: ApplicationCommandInputType.BUILT_IN,
            description: "start the edating!",
            options: [{
                name: "proposee",
                type: ApplicationCommandOptionType.USER,
                required: true,
                description: "Who's your cute kitten?"
            }, {
                name: "message",
                type: ApplicationCommandOptionType.USER,
                required: true,
                description: "gimme yourbest pickup line"
            }], execute(args, ctx) {
                const proposee = args.find(it => it.name === "proposee")!!.value;
                const msg = args.find(it => it.name === "message")!!.value;
                (async () => {
                    if (proposee === UserStore.getCurrentUser().id) {
                        await sendSystemMessage("you cant marry yourself silly");
                        return;
                    }
                    const response = await fetchWedlock("POST", "v2/propose", {
                        to: proposee,
                        msg: "gay"
                    });
                    console.log(response);
                    sendMessage(ctx.channel.id, { content: `will you marry me <@${proposee}>? ${WL_HOSTNAME}/v2/propose/embed?proposalid=` + response.id });
                })();
            }
        },
        {
            name: "divorce",
            inputType: ApplicationCommandInputType.BUILT_IN,
            description: "no longer edate",
            options: [],
            execute(args, ctx) {
                (async () => {
                    const response = await fetchWedlock("POST", "v2/divorce");
                    if (response === null) {
                        sendSystemMessage("you're not married silly");
                    }
                })();
            }
        }
    ],
    patches: [
        {
            find: ".userTagNoNickname",
            replacement: {
                match: /variant:"text-sm\/normal",className:\i.pronouns,children:\i}\)}\)/,
                replace: "$&, $self.guh(arguments[0].user.id)"
            }
        }
    ],
});




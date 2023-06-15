import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";

async function getcuteneko(): Promise<string> {
    const res = await fetch('https://nekos.best/api/v2/neko');
    const url = (await res.json()).results[0].url as string;
    return url;
  }
async function getlewdneko(): Promise<string> {
    const res = await fetch('https://api.waifu.pics/nsfw/neko');
    const url = (await res.json()).url as string;
    return url;
}



export default definePlugin({
    name: "Cute nekos",
    authors: [
        {
            id: 239809113125552129,
            name: "Snupai",
        },
    ],
    description: "what the fuck am i doing with my life",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "nekos",
        description: "aaaaaaaaaaaaaaaaaaaaaa",
        execute: async opts => ({
            content: await getcuteneko()
        })
    },
    {
        name: "lewd nekos",
        description: "AAAAAAAAAAAAAAAAAAAAAA",
        execute: async opts => ({
            content: await getlewdneko()
        })
    }]
});

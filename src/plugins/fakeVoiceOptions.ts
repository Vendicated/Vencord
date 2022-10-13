import definePlugin from "../utils/types";
import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage, Argument } from "../api/Commands";

const config = {
    fake_mute: false,
    fake_deafen: false,
}

export default definePlugin({
    dependencies: ["CommandsAPI"],
    name: "Fake Voice Options",
    description: "Fake mute, deafen",
    authors: [{
        name: "SaucyDuck",
        id: 1004904120056029256n
    }],
    patches: [
        {
            find:'e.setSelfMute(n);',
            replacement: [{
                // prevent client-side mute
                match: /e\.setSelfMute\(n\);/g,
                replace: 'e.setSelfMute(Vencord.Plugins.plugins["Fake Voice Options"].getConfig().fake_mute ? false : n);'
            },
            {
                // prevent client-side deafen
                match: /e\.setSelfDeaf\(t\.deaf\)/g,
                replace: 'e.setSelfDeaf(Vencord.Plugins.plugins["Fake Voice Options"].getConfig().fake_deafen ? false : t.deaf);'
            }]
        }
    ],
    commands: [
        {
            name: "fakevoiceoptions",
            inputType: ApplicationCommandInputType.BUILT_IN,
            description: "Set fake voice options",
            options: [
                {
                name: "fake-mute",
                description: "Make it look like you're muted (you can still speak)",
                type: ApplicationCommandOptionType.BOOLEAN
                },
                {
                    name: "fake-deaf",
                    description: "Make it look like you're deafened (you can still hear)",
                    type: ApplicationCommandOptionType.BOOLEAN
                }
            ],
            execute: (opts: Argument[], ctx): void => {

                opts.forEach((opt) => {
                    switch (opt.name) {
                        case "fake-mute":
                            config.fake_mute = (opt.value as unknown as boolean);
                            break;
                        case "fake-deaf":
                            config.fake_deafen = (opt.value as unknown as boolean);
                            break;
                    }
                });

                sendBotMessage(ctx.channel.id, {content: Object.entries(config).map(([k, v]) => `[${k}] : ${v}`).join(" - ")});
            },
        },
    ],
    getConfig: () => config
});

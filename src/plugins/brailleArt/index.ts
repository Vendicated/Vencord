import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { DraftType, UploadManager } from "@webpack/common";

import { Jimp } from "jimp";
import { brailleMap } from "./braille_map";
import { Devs } from "@utils/constants";
const UploadStore = findByPropsLazy("getUpload");

/**
 * Maps a color to 0 or 1
 *
 * @param color Color to convert
 * @returns 0 for black, 1 for white (depending on color theme)
 */
function mapToZeroOrOne(color: number) {
    if (color > 255) {
        return 1;
    }
    return 0;
}

/**
 * Get the braille character for a 2x3 grid of pixels
 *
 * @param image JIMP image
 * @param xOff x offset
 * @param yOff y offset
 * @returns Braille character
 */
function getBrailleCharacter(image: any, xOff: number, yOff: number) {
    const thing = [
        [
            mapToZeroOrOne(image.getPixelColor(0 + (xOff * 2), 0 + (yOff * 2))),
            mapToZeroOrOne(image.getPixelColor(1 + (xOff * 2), 0 + (yOff * 2)))
        ],
        [
            mapToZeroOrOne(image.getPixelColor(0 + (xOff * 2), 1 + (yOff * 2))),
            mapToZeroOrOne(image.getPixelColor(1 + (xOff * 2), 1 + (yOff * 2)))
        ],
        [
            mapToZeroOrOne(image.getPixelColor(0 + (xOff * 2), 2 + (yOff * 2))),
            mapToZeroOrOne(image.getPixelColor(1 + (xOff * 2), 2 + (yOff * 2)))
        ]
    ];

    // i hate javascript
    return brailleMap.get(JSON.stringify(thing));
}


export default definePlugin({
    name: "BrailleArt",
    description: "Converts an image to braille art",
    authors: [Devs.Cobble],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "brailleart",
            description: "Converts an image to braille art",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    type: ApplicationCommandOptionType.ATTACHMENT,
                    name: "image",
                    description: "The image to convert to braille art",
                    required: true
                },
                {
                    type: ApplicationCommandOptionType.NUMBER,
                    name: "width",
                    description: "The width of the text, will print max size if not provided",
                    required: false
                }
            ],
            execute: async (opts, ctx) => {
                const upload = UploadStore.getUpload(ctx.channel.id, opts.find(o => o.name === "image")!.name, DraftType.SlashCommand);
                let rawImage: File | null = null;

                // is the file an image?
                if (upload) {
                    if (!upload.isImage) {
                        UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
                        throw "Upload is not an image";
                    }
                    rawImage = upload.item.file;
                }

                if (!rawImage) {
                    throw "No image provided";
                }

                // do processing
                const imageData = await Jimp.read(await rawImage.arrayBuffer());
                const image = imageData.greyscale().contrast(1);
                let s = "```\n";

                if (opts.find(o => o.name === "width")) {
                    image.resize({ w: parseInt(opts.find(o => o.name === "width")!.value) });
                }

                // write characters
                for (let i = 0; i < image.height / 2; i++) {
                    for (let j = 0; j < image.width / 2; j++) {
                        s += getBrailleCharacter(image, j, i);
                    }
                    s += "\n";
                }

                sendBotMessage(ctx.channel.id, {
                    content: s + "\n```"
                });
            }
        }
    ]

});

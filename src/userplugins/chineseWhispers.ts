import { SendListener, addPreSendListener, removePreSendListener, } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { lang } from "moment";

let languages: string[] = [
    "en",
    "af",   // Afrikaans
    "sq",   // Albanian
    "am",   // Amharic
    "ar",   // Arabic
    "hy",   // Armenian
    "az",   // Azerbaijani
    "eu",   // Basque
    "be",   // Belarusian
    "bn",   // Bengali
    "bs",   // Bosnian
    "bg",   // Bulgarian
    "ca",   // Catalan
    "ceb",  // Cebuano
    "ny",   // Chichewa (Chewa, Nyanja)
    "zh",   // Chinese (Simplified and Traditional)
    "co",   // Corsican
    "hr",   // Croatian
    "cs",   // Czech
    "da",   // Danish
    "nl",   // Dutch
    "en",   // English
    "eo",   // Esperanto
    "et",   // Estonian
    "tl",   // Filipino (Tagalog)
    "fi",   // Finnish
    "fr",   // French
    "fy",   // Frisian
    "gl",   // Galician
    "ka",   // Georgian
    "de",   // German
    "el",   // Greek
    "gu",   // Gujarati
    "ht",   // Haitian Creole
    "ha",   // Hausa
    "haw",  // Hawaiian
    "iw",   // Hebrew
    "hi",   // Hindi
    "hmn",  // Hmong
    "hu",   // Hungarian
    "is",   // Icelandic
    "ig",   // Igbo
    "id",   // Indonesian
    "ga",   // Irish
    "it",   // Italian
    "ja"   // Japanese
]

const settings = definePluginSettings({
    intensity: {
        type: OptionType.SLIDER,
        description: "How many languages the message is translated between- More for more distortion, less for minor changes",
        default: languages.length,
        markers: Array(languages.length - 2).fill(0).map((_, index) => index + 2),
        stickToMarkers: true,
    },
    shuffle: {
        type: OptionType.BOOLEAN,
        description: "If the languages array should be shuffled with every message. Better variety but you will not be able to reproduce messages",
        default: true
    }
});

export async function comedicChineseWhispers(inputText: string, language : string[]): Promise<string> {
    let currentText = inputText;
    if(settings.store.shuffle)
    {
        languages = languages.map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
    }

    language = language.concat("en");
    
    for (let i = 0; i < language.length; i++) {
        const sourceLang = i === 0 ? "auto" : language[i - 1];
        const targetLang = language[i];

        const translation = await translateText(sourceLang, targetLang, currentText);

        currentText = translation;
    }

    return currentText;
}

async function translateText(sourceLang: string, targetLang: string, text: string): Promise<string> {
    
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dj=1&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to translate "${text}" from ${sourceLang} to ${targetLang}: ${response.status} ${response.statusText}`);
    }

    const { sentences }: { sentences: { trans?: string }[] } = await response.json();
    const translatedText = sentences.map(s => s?.trans).filter(Boolean).join("");

    return translatedText;
}

let presendObject : SendListener = async (channelId, msg) =>
{
    msg.content = await comedicChineseWhispers(msg.content, languages.slice(0, settings.store.intensity));
}

export default definePlugin({
    name: "ChineseWhispers",
    description: "Translate plugin but 20x more funny",
    authors: [
        Devs.Samwich
    ],
    dependencies: ["MessageEventsAPI"],
    start()
    {
        addPreSendListener(presendObject);
    },
    stop()
    {
        removePreSendListener(presendObject);
    },
    settings
});

/** biome-ignore-all lint/complexity/useLiteralKeys: ilike it*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import Seed from "./seed.js";
import { getCapitalPercentage, InitModifierParam, isAt, isUri } from "./utils.js";

const DEFAULTS = {
    SPACES: { faces: 0.05, actions: 0.075, stutters: 0.1 },
    WORDS: 1,
    EXCLAMATIONS: 1,
};

export default class Uwuifier {
    constructor({ spaces = DEFAULTS.SPACES, words = DEFAULTS.WORDS, exclamations = DEFAULTS.EXCLAMATIONS } = {
        spaces: DEFAULTS.SPACES,
        words: DEFAULTS.WORDS,
        exclamations: DEFAULTS.EXCLAMATIONS,
    }) {
        Object.defineProperty(this, "faces", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: [
                "(・`ω´・)",
                ";;w;;",
                "OwO",
                "UwU",
                ">w<",
                "^w^",
                "ÚwÚ",
                "^-^",
                ":3",
                "x3",
                ";3",
                ":3c"
            ]
        });
        Object.defineProperty(this, "exclamations", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["!?", "?!!", "?!?1", "!!11", "?!?!"]
        });
        Object.defineProperty(this, "actions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: [
                "*blushes*",
                "*whispers to self*",
                "*cries*",
                "*screams*",
                "*sweats*",
                "*runs away*",
                "*screeches*",
                "*walks away*",
                "*looks at you*",
                "*huggles tightly*",
                "*boops your nose*",
                "*stares cutely*",
                "*blushes softly*",
                "*licks nose*",
                "*nuzzles closer*",
                "*licks neck*",
                "*twerks*",
                "*starts twerking*",
            ]
        });
        Object.defineProperty(this, "uwuMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: [
                [/(?:r|l)/g, "w"],
                [/(?:R|L)/g, "W"],
                [/n([aeiou])/g, "ny$1"],
                [/N([aeiou])/g, "Ny$1"],
                [/N([AEIOU])/g, "Ny$1"],
                [/ove/g, "uv"],
            ]
        });
        Object.defineProperty(this, "_spacesModifier", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_wordsModifier", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_exclamationsModifier", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._spacesModifier = spaces ?? DEFAULTS.SPACES;
        this._wordsModifier = words ?? DEFAULTS.WORDS;
        this._exclamationsModifier = exclamations ?? DEFAULTS.EXCLAMATIONS;
    }
    uwuifyWords(sentence) {
        const words = sentence.split(" ");
        const uwuifiedSentence = words.map((word) => {
            if (isAt(word))
                return word;
            if (isUri(word))
                return word;
            const seed = new Seed(word);
            for (const [oldWord, newWord] of this.uwuMap) {
                // Generate a random value for every map so words will be partly uwuified instead of not at all
                if (seed.random() > this._wordsModifier)
                    continue;
                word = word.replace(oldWord, newWord);
            }
            return word;
        }).join(" ");
        return uwuifiedSentence;
    }
    uwuifySpaces(sentence) {
        const words = sentence.split(" ");
        const faceThreshold = this._spacesModifier.faces;
        const actionThreshold = this._spacesModifier.actions + faceThreshold;
        const stutterThreshold = this._spacesModifier.stutters + actionThreshold;
        const uwuifiedSentence = words.map((word, index) => {
            const seed = new Seed(word);
            const random = seed.random();
            const [firstCharacter] = word;
            if (random <= faceThreshold && this.faces) {
                // Add random face before the word
                word += " " + this.faces[seed.randomInt(0, this.faces.length - 1)];
                checkCapital();
            }
            else if (random <= actionThreshold && this.actions) {
                // Add random action before the word
                word += " " + this.actions[seed.randomInt(0, this.actions.length - 1)];
                checkCapital();
            }
            else if (random <= stutterThreshold && !isUri(word)) {
                // Add stutter with a length between 0 and 2
                const stutter = seed.randomInt(0, 2);
                return (firstCharacter + "-").repeat(stutter) + word;
            }
            function checkCapital() {
                // Check if we should remove the first capital letter
                if (firstCharacter !== firstCharacter.toUpperCase())
                    return;
                // if word has higher than 50% upper case
                if (getCapitalPercentage(word) > 0.5)
                    return;
                // If it's the first word
                if (index === 0) {
                    // Remove the first capital letter
                    word = firstCharacter.toLowerCase() + word.slice(1);
                }
                else {
                    const previousWord = words[index - 1];
                    const previousWordLastChar = previousWord[previousWord.length - 1];
                    const prevWordEndsWithPunctuation = new RegExp("[.!?\\-]").test(previousWordLastChar);
                    if (!prevWordEndsWithPunctuation)
                        return;
                    word = firstCharacter.toLowerCase() + word.slice(1);
                }
            }
            return word;
        }).join(" ");
        return uwuifiedSentence;
    }
    uwuifyExclamations(sentence) {
        const words = sentence.split(" ");
        const pattern = new RegExp("[?!]+$");
        const uwuifiedSentence = words.map((word) => {
            const seed = new Seed(word);
            // If there are no exclamations return
            if (!pattern.test(word) || seed.random() > this._exclamationsModifier) {
                return word;
            }
            word = word.replace(pattern, "");
            word +=
                this.exclamations[seed.randomInt(0, this.exclamations.length - 1)];
            return word;
        }).join(" ");
        return uwuifiedSentence;
    }
    uwuifySentence(sentence) {
        let uwuifiedString = sentence;
        uwuifiedString = this.uwuifyWords(uwuifiedString);
        uwuifiedString = this.uwuifyExclamations(uwuifiedString);
        uwuifiedString = this.uwuifySpaces(uwuifiedString);
        return uwuifiedString;
    }
}

__decorate([
    InitModifierParam()
], Uwuifier.prototype, "_spacesModifier", void 0);
__decorate([
    InitModifierParam()
], Uwuifier.prototype, "_wordsModifier", void 0);
__decorate([
    InitModifierParam()
], Uwuifier.prototype, "_exclamationsModifier", void 0);

const state = {
    uwuifier: new Uwuifier()
};

export function getUwuifier() {
    return state.uwuifier;
}

export function reloadUwuifier(uwuifierSettings) {
    state.uwuifier = new Uwuifier({
        spaces: {
            faces: !uwuifierSettings.faces ? 0 : 0.5,
            actions: !uwuifierSettings.actions ? 0 : 0.075,
            stutters: !uwuifierSettings.stutters ? 0 : 0.1,
        },
        words: !uwuifierSettings.words ? 0 : 1,
        exclamations: !uwuifierSettings.exclamations ? 0 : 1,
    });
}

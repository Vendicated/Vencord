import { FluxStore } from "..";

export class SpellCheckStore extends FluxStore {
    hasLearnedWord(word: string): boolean;
    findLearnedWordIn(text: string): string | null;
    isEnabled(): boolean;
}

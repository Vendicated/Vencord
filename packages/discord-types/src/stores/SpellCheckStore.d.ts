import { FluxStore } from "..";

export class SpellCheckStore extends FluxStore {
    hasLearnedWord(word: string): boolean;
    isEnabled(): boolean;
}

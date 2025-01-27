export interface FurudoSettings {
    provider: "openai" | "ollama";
    apiKey: string;
    model: string;
    showIcon: string;
    contextMenu: string;
    characterName: string;
    characterDescription: string;
    extraCharacterDescription: string;
    extraInstructions: string;
    exampleOne: string;
    exampleTwo: string;
    exampleThree: string;
}

import { FluxStore } from "..";

export class UserProfileSettingsStore extends FluxStore {
    get selectedGuildId(): string | undefined;
    getPendingChanges(guildId?: string): Record<string, any>;
    getFormState(): unknown;
    getErrors(guildId?: string): Record<string, unknown>;
    getTryItOutChanges(): Record<string, unknown>;
    hasTryItOutChanges(): boolean;
    hasUnsavedChanges(): boolean;
    showNotice(): boolean;
    canSubmit(): boolean;
}

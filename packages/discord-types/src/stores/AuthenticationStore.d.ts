import { FluxStore } from "..";

export class AuthenticationStore extends FluxStore {
    /**
     * Gets the id of the current user
     */
    getId(): string;

    // This Store has a lot more methods related to everything Auth, but they really should
    // not be needed, so they are not typed
}

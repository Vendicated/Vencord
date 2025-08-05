import { FluxStore } from "..";

export class AuthenticationStore extends FluxStore {
    /**
     * Gets the id of the current user
     */
    getId(): string;
}

type Updater = (value: any) => any;

/**
 * Common Record class extended by various Discord data structures, like User, Channel, Guild, etc.
 */
export class DiscordRecord {
    toJS(): Record<string, any>;

    set(key: string, value: any): this;
    merge(data: Record<string, any>): this;
    update(key: string, defaultValueOrUpdater: Updater | any, updater?: Updater): this;
}

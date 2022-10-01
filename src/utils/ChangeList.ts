export class ChangeList<T>{
    private set = new Set<T>;

    public get changeCount() {
        return this.set.size;
    }

    public get hasChanges() {
        return this.changeCount > 0;
    }

    public handleChange(item: T) {
        if (!this.set.delete(item))
            this.set.add(item);
    }

    public getChanges() {
        return this.set.values();
    }

    public map<R>(mapper: (v: T, idx: number, arr: T[]) => R): R[] {
        return [...this.getChanges()].map(mapper);
    }
}

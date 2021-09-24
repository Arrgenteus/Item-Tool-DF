export class EphemeralMap<K, V> extends Map<K, V> {
    elementExpirationTime: number;
    constructor(elementExpirationTime: number) {
        super();
        this.elementExpirationTime = elementExpirationTime;
    }

    set(key: K, value: V): this {
        super.set(key, value);
        setTimeout(() => this.delete(key), this.elementExpirationTime);
        return this;
    }
}

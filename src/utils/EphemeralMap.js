export class EphemeralMap extends Map {
    elementExpirationTime;
    constructor(elementExpirationTime) {
        super();
        this.elementExpirationTime = elementExpirationTime;
    }
    set(key, value) {
        super.set(key, value);
        setTimeout(() => this.delete(key), this.elementExpirationTime);
        return this;
    }
}

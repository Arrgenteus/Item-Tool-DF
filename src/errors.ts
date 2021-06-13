export class ValidationError extends Error {}

export class ValueError extends Error {}

export class InvalidExpressionError extends ValidationError {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class UnexpectedInvalidExpressionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

import { InvalidExpressionError } from '../../errors';
import { capitalize, isResist } from '../../utils/misc';
import { MongoSortExpression, SortExpressionData } from './types';

const MAX_OPERATORS: number = 5;
const OPERATORS: {
    [operator: string]: {
        precedence: number;
        unary: boolean;
        mongoFunc: string;
    };
} = {
    '+': { precedence: 1, unary: false, mongoFunc: '$add' },
    '-': { precedence: 1, unary: false, mongoFunc: '$subtract' },
    'u-': { precedence: 2, unary: true, mongoFunc: '$subtract' },
};
const ALIASES: { [alias: string]: string } = {
    dmg: 'damage',
    immo: 'immobility',
    melee: 'melee def',
    'melee defence': 'melee def',
    'melee defense': 'melee def',
    magic: 'magic def',
    'magic defence': 'magic def',
    'magic defense': 'magic def',
    pierce: 'pierce def',
    'pierce defence': 'pierce def',
    'pierce defense': 'pierce def',
    dark: 'darkness',
    void: '???',
};

function pop(stack: any[]): any {
    if (!stack.length) throw new RangeError('Attempting to pop from empty array');
    return stack.pop();
}

export function unaliasBonusName(operand: string): string {
    let trimmedOperand = operand;
    if (operand.slice(-4) === ' res') trimmedOperand = operand.slice(0, -4);
    else if (operand.slice(-7) === ' resist') trimmedOperand = operand.slice(0, -7);
    else if (operand.slice(-11) === ' resistance') trimmedOperand = operand.slice(0, -11);
    trimmedOperand = trimmedOperand.trim();

    return ALIASES[trimmedOperand] || trimmedOperand;
}

function tokenizeExpression(expression: string): string[] {
    expression = expression.trim();
    const tokenizedExpression = [];
    const usedOperands = new Set();
    let operatorCount = 0;
    for (let i = 0; i < expression.length; ++i) {
        const token = expression[i].toLowerCase();
        if (token === ' ') continue;

        if (token in OPERATORS) {
            operatorCount += 1;
            if (operatorCount > MAX_OPERATORS)
                throw new InvalidExpressionError(
                    `You cannot have more than ${MAX_OPERATORS} operators in your sort expression.`
                );

            tokenizedExpression.push(token);
        } else if (token in { '(': 1, ')': 1 }) {
            tokenizedExpression.push(token);
        } else if (token.match(/[a-z?]/)) {
            let operand = '';
            while (i < expression.length && expression[i].toLowerCase().match(/[ a-z?]/)) {
                operand += expression[i].toLowerCase();
                i += 1;
            }
            i -= 1;
            operand = unaliasBonusName(operand.trim());
            if (usedOperands.has(operand))
                throw new InvalidExpressionError(
                    `You cannot use an operand more than once. You reused \`${operand}\`.`
                );
            usedOperands.add(operand);
            tokenizedExpression.push(operand.trim());
        } else
            throw new InvalidExpressionError(`'${token}' is an invalid sort expression character.`);
    }
    return tokenizedExpression;
}

function infixToPostfix(tokenizedExpression: string[]): string[] {
    const operatorStack: string[] = [];
    const postfixExpression: string[] = [];
    enum TokenTypes {
        OPEN,
        CLOSE,
        OPERATOR,
        OPERAND,
    }

    let lastTokenType: TokenTypes | undefined;
    for (const token of tokenizedExpression) {
        if (token === '(') {
            if (lastTokenType === TokenTypes.CLOSE) {
                throw new InvalidExpressionError(
                    'You cannot have an open bracket right after a close bracket.'
                );
            }
            if (lastTokenType === TokenTypes.OPERAND) {
                throw new InvalidExpressionError(
                    'You cannot have an open bracket right after an operand.'
                );
            }
            operatorStack.push(token);
            lastTokenType = TokenTypes.OPEN;
        } else if (token === ')') {
            if (lastTokenType === TokenTypes.OPERATOR) {
                throw new InvalidExpressionError(
                    'You cannot have a close bracket right after an operator.'
                );
            }
            if (lastTokenType === TokenTypes.OPEN) {
                throw new InvalidExpressionError('Bracket pairs cannot be empty.');
            }

            // Move all tokens until the last '(' into the result
            while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
                postfixExpression.push(pop(operatorStack));
            }
            if (operatorStack[operatorStack.length - 1] === '(') pop(operatorStack);
            // Remove the '('
            else
                throw new InvalidExpressionError('Make sure your brackets are balanced correctly.');
            lastTokenType = TokenTypes.CLOSE;
        } else if (token in OPERATORS) {
            // Operator is a unary operator if the previous token was either an open bracket or another operator
            const modifiedToken =
                !lastTokenType || [TokenTypes.OPEN, TokenTypes.OPERATOR].includes(lastTokenType)
                    ? 'u' + token
                    : token;

            if (modifiedToken === 'u+') continue; // Unary + is redundant

            const priority = OPERATORS[modifiedToken].precedence;
            let [top] = operatorStack.slice(-1);
            // Pop all operators with higher precedence than current
            while (top && top in OPERATORS && priority <= OPERATORS[top].precedence) {
                postfixExpression.push(pop(operatorStack));
                [top] = operatorStack.slice(-1);
            }
            operatorStack.push(modifiedToken);
            lastTokenType = TokenTypes.OPERATOR;
        } else {
            if (lastTokenType === TokenTypes.CLOSE) {
                throw new InvalidExpressionError(
                    'You cannot have an operand right after a close bracket.'
                );
            }
            lastTokenType = TokenTypes.OPERAND;
            postfixExpression.push(token);
        }
    }
    if (lastTokenType === TokenTypes.OPERATOR) {
        throw new InvalidExpressionError('You cannot end an expression with an operator.');
    }

    while (operatorStack.length) {
        const operator: string = pop(operatorStack);
        if (operator! in { '(': 1, ')': 1 }) {
            throw new InvalidExpressionError('The brackets in your expression are not balanced.');
        }
        postfixExpression.push(operator);
    }

    return postfixExpression;
}

function prettifyExpression(postfixExpression: string[]): string {
    const operandStack: string[] = [];
    for (const token of postfixExpression) {
        if (token in OPERATORS) {
            let topOperand = pop(operandStack);

            // Handle unary operators
            if (OPERATORS[token].unary) {
                // Unary operators are prepended with the character 'u'
                operandStack.push(`(${token[1]}${topOperand})`);
            }
            // Handle binary operators
            else {
                const previousOperand = operandStack.pop();

                operandStack.push(`(${previousOperand} ${token} ${topOperand})`);
            }
        } else {
            let field: string = token;
            if (token === 'damage') field = 'avg damage';
            else if (isResist(token)) field = `${token} res`;
            operandStack.push(capitalize(field));
        }
    }
    let result = operandStack.pop()!; // There should only be 1 element
    if (result[0] === '(' && result[result.length - 1] === ')') result = result.slice(1, -1);

    return result;
}

function mongoExpression(postfixExpression: string[]): MongoSortExpression {
    const mongoExpression: MongoSortExpression[] = [];
    for (const token of postfixExpression) {
        if (token in OPERATORS) {
            const operator = OPERATORS[token];
            const topOperand = pop(mongoExpression);

            // Handle unary operators
            if (operator.unary) {
                mongoExpression.push({ [operator.mongoFunc]: [0, topOperand] });
            }
            // Handle binary operators
            else {
                const previousOperand = pop(mongoExpression);
                mongoExpression.push({
                    [operator.mongoFunc]: [previousOperand, topOperand],
                });
            }
        } else {
            let field = token;
            if (token === 'damage') field = '$' + field;
            else if (!isResist(token)) field = '$bonuses.' + field;
            else field = '$resists.' + field;

            mongoExpression.push({ $ifNull: [field, 0] });
        }
    }

    return pop(mongoExpression);
}

export function parseSortExpression(baseExpression: string): SortExpressionData {
    try {
        if (baseExpression.length > 100)
            throw new InvalidExpressionError(
                'Your sort expression cannot be longer than 100 characters'
            );
        const tokenized = tokenizeExpression(baseExpression);
        const postfix = infixToPostfix(tokenized);
        const pretty = prettifyExpression(postfix);
        const mongo = mongoExpression(postfix);
        return { baseExpression, pretty, mongo };
    } catch (err) {
        if (err instanceof InvalidExpressionError) {
            // Display the first 500 characters of their input expression at the max
            let trimmedExpression = baseExpression.slice(0, 500);
            if (baseExpression.length > 500) trimmedExpression += '...';
            err.message += `\n\nYour expression: \`${trimmedExpression}\``;
        }
        throw err;
    }
}

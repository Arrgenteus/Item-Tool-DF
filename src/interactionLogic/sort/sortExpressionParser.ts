import { Util } from 'discord.js';
import { InvalidExpressionError, ValueError } from '../../errors';
import { capitalize, isResist } from '../../utils/misc';
import { MongoSortExpression, SortExpressionData } from './types';

const MAX_OPERATORS: number = 6;
const MAX_OPERAND_LENGTH: number = 20;
const OPERATORS: {
    [operator: string]: {
        precedence: number;
        unary: boolean;
        mongoFunc: string;
    };
} = {
    '+': { precedence: 1, unary: false, mongoFunc: '$add' },
    '-': { precedence: 1, unary: false, mongoFunc: '$subtract' },
    '*': { precedence: 2, unary: false, mongoFunc: '$multiply' },
    '/': { precedence: 2, unary: false, mongoFunc: '$divide' },
    'u-': { precedence: 2, unary: true, mongoFunc: '$subtract' },
};
const ALIASES: { [alias: string]: string } = {
    'average damage': 'damage',
    'avg damage': 'damage',
    'avg dmg': 'damage',
    dark: 'darkness',
    dmg: 'damage',
    immo: 'immobility',
    luck: 'luk',
    magic: 'magic def',
    'magic defence': 'magic def',
    'magic defense': 'magic def',
    melee: 'melee def',
    'melee defence': 'melee def',
    'melee defense': 'melee def',
    pierce: 'pierce def',
    'pierce defence': 'pierce def',
    'pierce defense': 'pierce def',
    void: '???',
};

const compressedOperands: { [operand: string]: string } = {
    block: '#1',
    dodge: '#2',
    parry: '#3',
    crit: '#4',
    'magic def': '#5',
    'melee def': '#6',
    'pierce def': '#7',
    wis: '#8',
    end: '#9',
    cha: '#A',
    luk: '#B',
    int: '#C',
    dex: '#D',
    str: '#E',
    bonus: '#F',

    // Most non-joke elements
    all: '#G',
    fire: '#H',
    water: '#I',
    darkness: '#J',
    light: '#K',
    ice: '#L',
    energy: '#M',
    wind: '#N',
    stone: '#O',
    nature: '#P',
    good: '#Q',
    evil: '#R',
    immobility: '#S',
    health: '#T',
    '???': '#U',
    metal: '#V',
    silver: '#W',
    bacon: '#X',
    poison: '#Y',
    fear: '#Z',
    disease: '#a',
    ebil: '#b',
    curse: '#c',
    null: '#d',
    none: '#e',
};

const uncompressedOperands: { [operand: string]: string } = {};
for (const [operand, compressed] of Object.entries(compressedOperands)) {
    uncompressedOperands[compressed] = operand;
}

function pop(stack: string[]): string;
function pop(stack: MongoSortExpression[]): MongoSortExpression;
function pop(stack: string[] | MongoSortExpression[]): string | MongoSortExpression {
    if (!stack.length) throw new RangeError('Attempting to pop from empty array');
    return stack.pop()!;
}

export function unaliasBonusName(operand: string): string {
    let trimmedOperand = operand;
    if (operand.slice(-4) === ' res') trimmedOperand = operand.slice(0, -4);
    else if (operand.slice(-7) === ' resist') trimmedOperand = operand.slice(0, -7);
    else if (operand.slice(-11) === ' resistance') trimmedOperand = operand.slice(0, -11);
    trimmedOperand = trimmedOperand.trim();

    return ALIASES[trimmedOperand] || trimmedOperand;
}

function tokenizeExpression(expression: string, isCompressed?: boolean): (string | number)[] {
    expression = expression.trim();
    const tokenizedExpression: (string | number)[] = [];
    let containsOnlyConstants: boolean = true;
    let operatorCount: number = 0;
    let indexPosition: number = 0;

    while (indexPosition < expression.length) {
        const token = expression[indexPosition].toLowerCase();
        // Ignore spaces
        if (token === ' ') continue;

        if (token in OPERATORS) {
            operatorCount += 1;
            if (operatorCount >= MAX_OPERATORS)
                throw new InvalidExpressionError(
                    `You cannot have more than ${MAX_OPERATORS} operators in your sort expression.`
                );

            tokenizedExpression.push(token);
        } else if (token in { '(': 1, ')': 1 }) {
            tokenizedExpression.push(token);
        } else if (token.match(/[a-z?]/)) {
            containsOnlyConstants = false;
            let operand: string = '';
            while (
                indexPosition < expression.length &&
                expression[indexPosition].toLowerCase().match(/[ a-z?]/)
            ) {
                operand += expression[indexPosition].toLowerCase();
                if (operand.length > MAX_OPERAND_LENGTH)
                    throw new InvalidExpressionError(
                        `Each operand can only be ${MAX_OPERAND_LENGTH} characters long.`
                    );
                indexPosition += 1;
            }
            indexPosition -= 1;
            operand = unaliasBonusName(operand.trim());
            tokenizedExpression.push(operand.trim());
        } else if (token.match(/[0-9.]+/)) {
            let operand: string = '';
            while (indexPosition < expression.length && !(expression[indexPosition] in OPERATORS)) {
                operand += expression[indexPosition];
                if (operand.length > MAX_OPERAND_LENGTH) {
                    throw new InvalidExpressionError(
                        `Each operand can only be ${MAX_OPERAND_LENGTH} characters long.`
                    );
                }
                indexPosition += 1;
            }
            indexPosition -= 1;
            const numberOperand = Number(operand);
            if (isNaN(numberOperand)) {
                throw new InvalidExpressionError(`'${numberOperand}' is not a valid number.`);
            }
            if (numberOperand === 0) {
                throw new InvalidExpressionError(`'Sort expressions cannot use 0 as an operand.`);
            }
            tokenizedExpression.push(numberOperand);
        } else if (token === '#') {
            // Denotes an alias
            if (!isCompressed)
                throw new InvalidExpressionError(`'#' is an invalid sort expression character.`);

            if (expression[indexPosition + 1] === ' ')
                throw new ValueError(
                    `Invalid compressed sort operator. ${expression.slice(0, indexPosition + 1)} <-`
                );

            const compressedOperand: string = '#' + expression[indexPosition + 1];
            indexPosition += 1;

            const operand: string | undefined = uncompressedOperands[compressedOperand];
            if (!operand) throw new ValueError(`Invalid sort operator alias ${operand}`);

            tokenizedExpression.push(operand);
        } else {
            throw new InvalidExpressionError(`'${token}' is an invalid sort expression character.`);
        }
        indexPosition += 1;
    }
    if (containsOnlyConstants) {
        throw new InvalidExpressionError(`Sort expressions cannot only contain constant values.`);
    }

    return tokenizedExpression;
}

function infixToPostfix(tokenizedExpression: (string | number)[]): (string | number)[] {
    const operatorStack: string[] = [];
    const postfixExpression: (string | number)[] = [];
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
            let modifiedToken: string = token;
            // Operator is being used as a unary operator if the previous token was either an open bracket
            // or another operator
            if (!lastTokenType || [TokenTypes.OPEN, TokenTypes.OPERATOR].includes(lastTokenType)) {
                if (token === '+') continue; // Unary + is redundant
                // Only + and - can be used as unary operators
                if (token !== '-') {
                    throw new InvalidExpressionError(`Usage of operator ${token} is incorrect.`);
                }
                modifiedToken = 'u' + token;
            }

            const priority = OPERATORS[modifiedToken].precedence;
            let [top]: string[] = operatorStack.slice(-1);
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
        if (operator in { '(': 1, ')': 1 }) {
            throw new InvalidExpressionError('The brackets in your expression are not balanced.');
        }
        postfixExpression.push(operator);
    }

    return postfixExpression;
}

function cleanExpression(postfixExpression: (string | number)[], compressed?: boolean): string {
    const operandStack: string[] = [];
    for (const token of postfixExpression) {
        if (token in OPERATORS) {
            let topOperand: keyof typeof OPERATORS = pop(operandStack);

            // Handle unary operators
            if (OPERATORS[token].unary) {
                // Unary operators are prepended with the character 'u'
                operandStack.push(`${token[1]}${topOperand}`);
            }
            // Handle binary operators
            else {
                const previousOperand = pop(operandStack);

                operandStack.push(
                    [previousOperand, token, token === '-' ? `(${topOperand})` : topOperand].join(
                        compressed ? '' : ' '
                    )
                );
            }
        } else {
            if (compressed) {
                operandStack.push(compressedOperands[token] || token);
            } else {
                let field: string = token;
                if (token === 'damage') field = 'avg damage';
                else if (isResist(token)) field = `${token} res`;
                operandStack.push(capitalize(field));
            }
        }
    }
    let result = pop(operandStack); // There should only be 1 element
    if (result[0] === '(' && result[result.length - 1] === ')') result = result.slice(1, -1);

    return result;
}

function mongoExpression(postfixExpression: string[]): MongoSortExpression {
    const mongoExp: MongoSortExpression[] = [];
    for (const token of postfixExpression) {
        if (token in OPERATORS) {
            const operator = OPERATORS[token];
            const topOperand: MongoSortExpression = pop(mongoExp);

            // Handle unary operators
            if (operator.unary) {
                mongoExp.push({ [operator.mongoFunc]: [0, topOperand] });
            }
            // Handle binary operators
            else {
                const previousOperand = pop(mongoExp);
                mongoExp.push({
                    [operator.mongoFunc]: [previousOperand, topOperand],
                });
            }
        } else {
            let field: string = token;
            if (token === 'damage') field = '$' + field;
            else if (!isResist(token)) field = '$bonuses.' + field;
            else field = '$resists.' + field;

            mongoExp.push({ $ifNull: [field, 0] });
        }
    }

    return pop(mongoExp);
}

export function parseSortExpression(baseExpression: string): SortExpressionData {
    try {
        if (baseExpression.length > 100)
            throw new InvalidExpressionError(
                'Your sort expression cannot be longer than 100 characters'
            );
        const tokenized: (string | number)[] = tokenizeExpression(baseExpression);
        const postfix: (string | number)[] = infixToPostfix(tokenized);
        const pretty: string | number = cleanExpression(postfix);
        const compressed: string | number = cleanExpression(postfix, true);
        const mongo: MongoSortExpression = mongoExpression(postfix);
        return { baseExpression, pretty, compressed, mongo };
    } catch (err) {
        if (err instanceof InvalidExpressionError) {
            // Display the first 500 characters of their input expression at the max
            let trimmedExpression: string = baseExpression.slice(0, 500);
            if (baseExpression.length > 500) trimmedExpression += '...';
            err.message += `\n\nYour expression: \`${Util.escapeMarkdown(trimmedExpression)}\``;
        }
        throw err;
    }
}

export function parseCompressedSortExpression(compressedExpression: string): SortExpressionData {
    const tokenized: string[] = tokenizeExpression(compressedExpression, true);
    const postfix: string[] = infixToPostfix(tokenized);
    const pretty: string = cleanExpression(postfix);
    const mongo: MongoSortExpression = mongoExpression(postfix);
    return { pretty, compressed: compressedExpression, mongo };
}

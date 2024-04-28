import { Util } from 'discord.js';
import { InvalidExpressionError, ValueError } from '../../errors';
import { capitalize, isResist } from '../../utils/misc';
const MAX_OPERATORS = 20;
const MAX_OPERAND_LENGTH = 20;
const OPERATORS = {
    '+': { precedence: 1, unary: false, mongoFunc: '$add' },
    '-': { precedence: 1, unary: false, mongoFunc: '$subtract' },
    '*': { precedence: 2, unary: false, mongoFunc: '$multiply' },
    '/': { precedence: 2, unary: false, mongoFunc: '$divide' },
    'u-': { precedence: 3, unary: true, mongoFunc: '$subtract' },
};
const ALIASES = {
    'average damage': 'damage',
    'avg damage': 'damage',
    'avg dmg': 'damage',
    dark: 'darkness',
    dmg: 'damage',
    immo: 'immobility',
    luck: 'luk',
    magic: 'magic def',
    magicdef: 'magic def',
    'magic defence': 'magic def',
    magicdefence: 'magic def',
    'magic defense': 'magic def',
    magicdefense: 'magic def',
    melee: 'melee def',
    meleedef: 'melee def',
    'melee defence': 'melee def',
    meleedefence: 'melee def',
    'melee defense': 'melee def',
    meleedefense: 'melee def',
    pierce: 'pierce def',
    piercedef: 'pierce def',
    'pierce defence': 'pierce def',
    piercedefence: 'pierce def',
    'pierce defense': 'pierce def',
    piercedefense: 'pierce def',
    void: '???',
};
function pop(stack) {
    if (!stack.length)
        throw new RangeError('Attempting to pop from empty array');
    return stack.pop();
}
function arithmeticOperation(operatorToken, operand1, operand2) {
    if (operatorToken === 'u-')
        return -1 * operand1;
    if (!operand2) {
        throw new ValueError('Only one operand was provided for a binary operation.');
    }
    switch (operatorToken) {
        case '+':
            return operand1 + operand2;
        case '-':
            return operand1 - operand2;
        case '*':
            return operand1 * operand2;
        case '/':
            return operand1 / operand2;
    }
    throw new ValueError(`Invalid binary operator ${operatorToken} provided`);
}
export function unaliasBonusName(operand) {
    let trimmedOperand = operand;
    if (operand.slice(-4) === ' res')
        trimmedOperand = operand.slice(0, -4);
    else if (operand.slice(-7) === ' resist')
        trimmedOperand = operand.slice(0, -7);
    else if (operand.slice(-11) === ' resistance')
        trimmedOperand = operand.slice(0, -11);
    trimmedOperand = trimmedOperand.trim();
    return ALIASES[trimmedOperand] || trimmedOperand;
}
function tokenizeExpression(expression) {
    expression = expression.trim();
    const tokenizedExpression = [];
    let containsOnlyConstants = true;
    let operatorCount = 0;
    let indexPosition = 0;
    const tooManyOperatorsMessage = `You cannot have more than ${MAX_OPERATORS} operators in your sort expression ` +
        '(MPM and BPD each count as 3 operators).';
    while (indexPosition < expression.length) {
        const token = expression[indexPosition].toLowerCase();
        // Ignore spaces
        if (token === ' ') {
            indexPosition += 1;
            continue;
        }
        if (token in OPERATORS) {
            operatorCount += 1;
            if (operatorCount > MAX_OPERATORS)
                throw new InvalidExpressionError(tooManyOperatorsMessage);
            tokenizedExpression.push(token);
        }
        else if (token in { '(': 1, ')': 1 }) {
            tokenizedExpression.push(token);
        }
        else if (token.match(/[a-z?]/)) {
            containsOnlyConstants = false;
            let operand = '';
            while (indexPosition < expression.length &&
                expression[indexPosition].toLowerCase().match(/[ a-z?]/)) {
                operand += expression[indexPosition].toLowerCase();
                if (operand.length > MAX_OPERAND_LENGTH)
                    throw new InvalidExpressionError(`Each operand can only be ${MAX_OPERAND_LENGTH} characters long.`);
                indexPosition += 1;
            }
            indexPosition -= 1;
            operand = unaliasBonusName(operand.trim());
            const MPMorBPD = {
                mpm: ['(', 'melee def', '+', 'pierce def', '+', 'magic def', ')', '/', 3],
                bpd: ['(', 'block', '+', 'parry', '+', 'dodge', ')', '/', 3],
            };
            if (operand in MPMorBPD) {
                operatorCount += 3;
                if (operatorCount > MAX_OPERATORS) {
                    throw new InvalidExpressionError(tooManyOperatorsMessage);
                }
                tokenizedExpression.push(...MPMorBPD[operand]);
            }
            else {
                tokenizedExpression.push(operand);
            }
        }
        else if (token.match(/[0-9.]+/)) {
            let operand = '';
            while (indexPosition < expression.length &&
                !(expression[indexPosition] in OPERATORS) &&
                !(expression[indexPosition] in { '(': 1, ')': 1 })) {
                operand += expression[indexPosition];
                if (operand.length > MAX_OPERAND_LENGTH) {
                    throw new InvalidExpressionError(`Each operand can only be ${MAX_OPERAND_LENGTH} characters long.`);
                }
                indexPosition += 1;
            }
            indexPosition -= 1;
            const numberOperand = Number(operand);
            if (isNaN(numberOperand)) {
                throw new InvalidExpressionError(`'${operand}' is not a valid number.`);
            }
            if (numberOperand === 0) {
                throw new InvalidExpressionError('Sort expressions cannot use 0 as an operand.');
            }
            if (numberOperand < 0.0001 || numberOperand > 10000) {
                throw new InvalidExpressionError('All constant sort expression operands must be between 0.0001 and 10000.');
            }
            tokenizedExpression.push(numberOperand);
        }
        else {
            throw new InvalidExpressionError(`'${Util.escapeMarkdown(token)}' is an invalid sort expression character.`);
        }
        indexPosition += 1;
    }
    if (containsOnlyConstants) {
        throw new InvalidExpressionError(`Sort expressions cannot only contain constant values.`);
    }
    return tokenizedExpression;
}
function infixToPostfix(tokenizedExpression) {
    const operatorStack = [];
    const postfixExpression = [];
    let TokenTypes;
    (function (TokenTypes) {
        TokenTypes[TokenTypes["OPEN"] = 0] = "OPEN";
        TokenTypes[TokenTypes["CLOSE"] = 1] = "CLOSE";
        TokenTypes[TokenTypes["OPERATOR"] = 2] = "OPERATOR";
        TokenTypes[TokenTypes["OPERAND"] = 3] = "OPERAND";
    })(TokenTypes || (TokenTypes = {}));
    let lastTokenType;
    for (const token of tokenizedExpression) {
        if (token === '(') {
            if (lastTokenType === TokenTypes.CLOSE) {
                throw new InvalidExpressionError('You cannot have an open bracket right after a close bracket.');
            }
            if (lastTokenType === TokenTypes.OPERAND) {
                throw new InvalidExpressionError('You cannot have an open bracket right after an operand.');
            }
            operatorStack.push(token);
            lastTokenType = TokenTypes.OPEN;
        }
        else if (token === ')') {
            if (lastTokenType === TokenTypes.OPERATOR) {
                throw new InvalidExpressionError('You cannot have a close bracket right after an operator.');
            }
            if (lastTokenType === TokenTypes.OPEN) {
                throw new InvalidExpressionError('Bracket pairs cannot be empty.');
            }
            // Move all tokens until the last '(' into the result
            while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
                postfixExpression.push(pop(operatorStack));
            }
            if (operatorStack[operatorStack.length - 1] === '(')
                pop(operatorStack);
            // Remove the '('
            else
                throw new InvalidExpressionError('Make sure your brackets are balanced correctly.');
            lastTokenType = TokenTypes.CLOSE;
        }
        else if (typeof token === 'string' && token in OPERATORS) {
            let modifiedToken = token;
            // Operator is being used as a unary operator if the previous token was either an open bracket
            // or another operator
            if (!lastTokenType || [TokenTypes.OPEN, TokenTypes.OPERATOR].includes(lastTokenType)) {
                if (token === '+')
                    continue; // Unary + is redundant
                // Only + and - can be used as unary operators
                if (token !== '-') {
                    throw new InvalidExpressionError(`Usage of operator ${token} is incorrect.`);
                }
                modifiedToken = 'u' + token;
            }
            const priority = OPERATORS[modifiedToken].precedence;
            let [top] = operatorStack.slice(-1);
            // Pop all operators with higher precedence than current
            while (top && top in OPERATORS && priority <= OPERATORS[top].precedence) {
                postfixExpression.push(pop(operatorStack));
                [top] = operatorStack.slice(-1);
            }
            operatorStack.push(modifiedToken);
            lastTokenType = TokenTypes.OPERATOR;
        }
        else {
            if (lastTokenType === TokenTypes.CLOSE) {
                throw new InvalidExpressionError('You cannot have an operand right after a close bracket.');
            }
            lastTokenType = TokenTypes.OPERAND;
            postfixExpression.push(token);
        }
    }
    if (lastTokenType === TokenTypes.OPERATOR) {
        throw new InvalidExpressionError('You cannot end an expression with an operator.');
    }
    while (operatorStack.length) {
        const operator = pop(operatorStack);
        if (operator in { '(': 1, ')': 1 }) {
            throw new InvalidExpressionError('The brackets in your expression are not balanced.');
        }
        postfixExpression.push(operator);
    }
    return postfixExpression;
}
function cleanExpression(postfixExpression) {
    const operandStack = [];
    for (const token of postfixExpression) {
        if (typeof token === 'number') {
            operandStack.push(token);
        }
        else if (token in OPERATORS) {
            let topOperand = pop(operandStack);
            // Handle unary operators
            if (OPERATORS[token].unary) {
                // Unary operators are prepended with the character 'u'
                if (typeof topOperand === 'number') {
                    operandStack.push(`${token[1]}${topOperand}`);
                }
                else {
                    operandStack.push(`${token[1]}(${topOperand})`);
                }
            }
            // Handle binary operators
            else {
                const previousOperand = pop(operandStack);
                operandStack.push([
                    token !== '+' && typeof previousOperand !== 'number'
                        ? `(${previousOperand})`
                        : previousOperand,
                    token,
                    token !== '+' && typeof topOperand !== 'number'
                        ? `(${topOperand})`
                        : topOperand,
                ].join(' '));
            }
        }
        else {
            let field = token;
            if (token === 'damage')
                field = 'avg damage';
            else if (isResist(token))
                field = `${token} res`;
            operandStack.push(capitalize(field));
        }
    }
    let result = pop(operandStack); // There should only be 1 element
    return result;
}
function mongoExpression(postfixExpression) {
    const mongoExpStack = [];
    for (const token of postfixExpression) {
        if (typeof token === 'string' && token in OPERATORS) {
            const operator = OPERATORS[token];
            const topOperand = pop(mongoExpStack);
            // Handle unary operators
            if (operator.unary) {
                if (typeof topOperand === 'number') {
                    mongoExpStack.push(arithmeticOperation(token, topOperand));
                }
                else {
                    mongoExpStack.push({ [operator.mongoFunc]: [0, topOperand] });
                }
            }
            // Handle binary operators
            else {
                const previousOperand = pop(mongoExpStack);
                if (token === '/') {
                    if (typeof topOperand !== 'number') {
                        throw new InvalidExpressionError('You may only divide by constant values.');
                    }
                    if (topOperand === 0) {
                        throw new InvalidExpressionError('You may not divide by an expression that evaluates to 0.');
                    }
                }
                if (typeof previousOperand === 'number' && typeof topOperand === 'number') {
                    mongoExpStack.push(arithmeticOperation(token, previousOperand, topOperand));
                }
                else {
                    mongoExpStack.push({
                        [operator.mongoFunc]: [previousOperand, topOperand],
                    });
                }
            }
        }
        else if (typeof token === 'number') {
            mongoExpStack.push(token);
        }
        else {
            let field = token;
            if (token === 'damage')
                field = '$avg_damage';
            else if (!isResist(token))
                field = '$bonuses.' + field;
            else
                field = '$resists.' + field;
            mongoExpStack.push({ $ifNull: [field, 0] });
        }
    }
    const resultantExpression = pop(mongoExpStack);
    if (typeof resultantExpression === 'number') {
        throw new InvalidExpressionError(`Sort expressions cannot only contain constant values.`);
    }
    return resultantExpression;
}
export function parseSortExpression(baseExpression, ignoreExpressionSize = false) {
    try {
        if (baseExpression.length > 100 && !ignoreExpressionSize) {
            throw new InvalidExpressionError(`Your sort expression cannot be longer than 100 characters. Your expression is ${baseExpression.length} characters long.`);
        }
        const tokenized = tokenizeExpression(baseExpression);
        const postfix = infixToPostfix(tokenized);
        const pretty = cleanExpression(postfix);
        const mongo = mongoExpression(postfix);
        return { baseExpression, pretty, mongo };
    }
    catch (err) {
        if (err instanceof InvalidExpressionError) {
            // Display the first 500 characters of their input expression at the max
            let trimmedExpression = baseExpression.slice(0, 500);
            if (baseExpression.length > 500)
                trimmedExpression += '...';
            err.message += `\n\nYour expression: ${Util.escapeMarkdown(trimmedExpression)}`;
        }
        throw err;
    }
}

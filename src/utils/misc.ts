const bonuses: Set<string> = new Set([
    'block',
    'dodge',
    'parry',
    'crit',
    'magic def',
    'pierce def',
    'melee def',
    'wis',
    'end',
    'cha',
    'luk',
    'int',
    'dex',
    'str',
    'bonus',
]);

/**
 * Capitalizes the first letter of every other word in the input text, with
 * few exceptions, which are instead capitalized fully
 *
 * @param {String} text
 *   Text to be capitalized
 *
 * @return {String}
 *   String with alternate words in the input text capitalized, or the text
 *   fully capitalized if the text is one of several values
 */
export function capitalize(text: string): string {
    const fullCapWords = new Set([
        // These words are fully capitalized
        'str',
        'int',
        'dex',
        'luk',
        'cha',
        'dm',
        'fs',
        'wis',
        'end',
        'dm',
        'so',
        'dc',
        'da',
        'ak',
    ]);
    if (fullCapWords.has(text)) return text.toUpperCase();

    if (!text || !text.trim()) return text;

    return text
        .trim()
        .split(' ')
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ');
}

export function isResist(value: string): boolean {
    if (bonuses.has(value) || value === 'damage') return false;
    return true;
}

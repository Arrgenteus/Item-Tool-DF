const bonuses = new Set([
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
export function capitalize(text) {
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
    if (fullCapWords.has(text))
        return text.toUpperCase();
    if (!text || !text.trim())
        return text;
    let capitalizedText = text[0].toUpperCase();
    for (let i = 1; i < text.length; ++i) {
        if ([',', ' ', '.', '/', '(', ')'].includes(text[i - 1])) {
            capitalizedText += text[i].toUpperCase();
        }
        else {
            capitalizedText += text[i];
        }
    }
    return capitalizedText;
}
export function isResist(value) {
    if (bonuses.has(value) || value === 'damage')
        return false;
    return true;
}
export function embed(description, title, footerText) {
    return {
        embeds: [
            {
                description,
                title,
                footer: footerText ? { text: footerText } : undefined,
            },
        ],
    };
}

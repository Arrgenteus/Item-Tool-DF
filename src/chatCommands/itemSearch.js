import config from '../config';
import { getSearchResultMessagewithButtons } from '../interactionLogic/search/search';
import { unaliasItemType } from '../interactionLogic/search/utils';
import { embed } from '../utils/misc';
import { botResponseCache } from '../utils/store';
const commandNames = [
    'item',
    'wep',
    'weap',
    'weapon',
    'sword',
    'axe',
    'mace',
    'staff',
    'wand',
    'dagger',
    'scythe',
    'acc',
    'accessory',
    'cape',
    'cloak',
    'wings',
    'wing',
    'helm',
    'helmet',
    'belt',
    'necklace',
    'neck',
    'ring',
    'trinket',
    'bracer',
    'pet',
    'cosmetic',
];
export const itemSearchCommand = {
    names: commandNames,
    run: async (message, itemNameToSearchFor, commandName) => {
        const itemSearchCategory = unaliasItemType(commandName);
        const channel = message.channel;
        if (!itemNameToSearchFor) {
            await channel.send(embed(`Usage: ${config.COMMAND_CHAR}${commandName} \`[name]\` _or_ ` +
                `${config.COMMAND_CHAR}${commandName} \`[name]\` \`(operator)\` \`[level]\` - ` +
                `Search for a ${itemSearchCategory} with an optional level filter\n` +
                '`(operator)` can be one of the following: ' +
                '`=`, `<`, `>`, `<=`, `>=`'));
            return;
        }
        const operatorList = [
            '=',
            '==',
            '===',
            '<',
            '>',
            '<=',
            '/',
            '=<',
            '>=',
            '=>',
        ].sort((a, b) => b.length - a.length);
        const operatorRegexp = new RegExp(operatorList.map((op) => `(?:${op})`).join('|'));
        const operatorMatch = itemNameToSearchFor.match(operatorRegexp);
        let maxLevel;
        let minLevel;
        if (operatorMatch) {
            const usedOperator = operatorMatch[0];
            const inputLevel = Number(itemNameToSearchFor.slice(operatorMatch.index + usedOperator.length).trim());
            if (!Number.isInteger(inputLevel)) {
                await channel.send('Either the number you entered is not a valid integer, or the operator you used is invalid.');
                return;
            }
            if (['=', '==', '===', '<', '<=', '=<', '/'].includes(usedOperator)) {
                maxLevel = inputLevel;
                if (usedOperator === '<')
                    maxLevel -= 1;
            }
            if (['=', '==', '===', '>', '>=', '=>'].includes(usedOperator)) {
                minLevel = inputLevel;
                if (usedOperator === '>')
                    minLevel += 1;
            }
            itemNameToSearchFor = itemNameToSearchFor.slice(0, operatorMatch.index).trim();
        }
        if (!itemNameToSearchFor) {
            await channel.send('The search query cannot be blank');
            return;
        }
        const itemSearchResult = await getSearchResultMessagewithButtons({
            term: itemNameToSearchFor,
            itemSearchCategory,
            maxLevel,
            minLevel,
            userIdForSimilarResults: message.author.id,
        });
        let sentMessage;
        if (itemSearchResult) {
            sentMessage = await channel.send(itemSearchResult);
        }
        else {
            sentMessage = await channel.send({
                embeds: [{ description: `No ${itemSearchCategory} was found.` }],
            });
        }
        botResponseCache.set(message.id, sentMessage);
    },
};

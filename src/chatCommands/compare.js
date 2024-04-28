import { unaliasItemType } from '../interactionLogic/search/utils';
import { ValidationError } from '../errors';
import { getCompareResultMessage } from '../interactionLogic/search/formattedResults';
const commandCategories = [
    'wep',
    'weap',
    'weapon',
    'cape',
    'cloak',
    'wing',
    'helm',
    'helmet',
    'belt',
    'necklace',
    'neck',
    'ring',
    'trinket',
    'bracer',
];
export const compareCommand = {
    names: commandCategories
        .map((category) => 'compare-' + category)
        .concat(commandCategories.map((category) => 'compare' + category))
        .concat(commandCategories.map((category) => 'compare-' + category + 's'))
        .concat(commandCategories.map((category) => 'compare' + category + 's')),
    run: async (message, itemsToCompareInput, commandName) => {
        const inputItemCategory = commandName
            .replace(/^compare-?/, '')
            .replace(/s$/, '');
        const itemSearchCategory = unaliasItemType(inputItemCategory);
        const itemsToCompare = itemsToCompareInput
            .split(',')
            .map((itemNameInput) => itemNameInput.trim())
            .slice(0, 2);
        if (itemsToCompare.length < 2 || itemsToCompare.filter((item) => !!item).length < 2) {
            throw new ValidationError('You must enter the names of two items to compare.');
        }
        const compareResultMessage = await getCompareResultMessage({
            term1: itemsToCompare[0],
            term2: itemsToCompare[1],
            itemSearchCategory: itemSearchCategory,
        });
        const channel = message.channel;
        await channel.send(compareResultMessage);
    },
};

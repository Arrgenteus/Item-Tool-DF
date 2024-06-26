import { GuildTextBasedChannel, Message } from 'discord.js';
import { ChatCommandData } from '../eventHandlerTypes.js';
import {
    SearchableItemCategory,
    SearchableItemCategoryAlias,
} from '../interactionLogic/search/types.js';
import { unaliasItemType } from '../interactionLogic/search/utils.js';
import { ValidationError } from '../errors.js';
import { getCompareResultMessage } from '../interactionLogic/search/formattedResults.js';

const commandCategories: (SearchableItemCategory | SearchableItemCategoryAlias)[] = [
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

export const compareCommand: ChatCommandData = {
    names: commandCategories
        .map((category) => 'compare-' + category)
        .concat(commandCategories.map((category) => 'compare' + category))
        .concat(commandCategories.map((category) => 'compare-' + category + 's'))
        .concat(commandCategories.map((category) => 'compare' + category + 's')),
    run: async (
        message: Message,
        itemsToCompareInput: string,
        commandName: string
    ): Promise<void> => {
        const inputItemCategory: SearchableItemCategory | SearchableItemCategoryAlias = commandName
            .replace(/^compare-?/, '')
            .replace(/s$/, '') as SearchableItemCategory | SearchableItemCategoryAlias;
        const itemSearchCategory: SearchableItemCategory = unaliasItemType(inputItemCategory);
        const itemsToCompare: string[] = itemsToCompareInput
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

        const channel: GuildTextBasedChannel = message.channel as GuildTextBasedChannel;
        await channel.send(compareResultMessage);
    },
};

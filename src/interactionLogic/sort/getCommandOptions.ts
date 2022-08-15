import {
    ApplicationCommandNonOptionsData,
    ApplicationCommandOptionChoiceData,
    ApplicationCommandOptionData,
} from 'discord.js';
import { ItemTag, PRETTY_TAG_NAMES } from '../../utils/itemTypeData';
import { ITEM_TAG_FILTER_OPTION_NAMES, PRETTY_ITEM_TYPES } from './constants';
import { SortCommandParams, SortItemTypeOption } from './types';

function getItemTagFilterOptions(): ApplicationCommandNonOptionsData[] {
    return ITEM_TAG_FILTER_OPTION_NAMES.map(
        ({
            optionName,
            tag,
        }: {
            optionName: SortCommandParams;
            tag: ItemTag;
        }): ApplicationCommandNonOptionsData => ({
            type: 'BOOLEAN',
            description: `Whether to include ${
                tag === 'none' ? 'untagged items' : ' items with ' + PRETTY_TAG_NAMES[tag] + ' tag'
            } in results`,
            name: optionName,
        })
    );
}

export function getSortCommandOptions(): ApplicationCommandOptionData[] {
    const itemTypeChoiceValues: SortItemTypeOption[] = [
        'items',
        'belt',
        'bracer',
        'capeOrWings',
        'helm',
        'necklace',
        'ring',
        'trinket',
        'weapon',
    ];

    const itemTypeChoiceList: ApplicationCommandOptionChoiceData[] = itemTypeChoiceValues.map(
        (itemTypeChoice: SortItemTypeOption): ApplicationCommandOptionChoiceData => ({
            name: itemTypeChoice === 'items' ? 'All Items' : PRETTY_ITEM_TYPES[itemTypeChoice],
            value: itemTypeChoice,
        })
    );

    return [
        {
            type: 'STRING',
            name: SortCommandParams.ITEM_TYPE,
            required: true,
            description: 'The type of item to sort',
            choices: itemTypeChoiceList,
        },
        {
            type: 'STRING',
            name: SortCommandParams.SORT_EXPRESSION,
            required: true,
            description: `Eg. "Ice", "Damage", "All + Health", "INT - (DEX + STR)", etc. Supports +, -, *, / operators`,
        },
        {
            type: 'STRING',
            name: SortCommandParams.WEAPON_ELEMENT,
            description:
                "Filter by weapon element. Only applicable if the selected item type is 'Weapon'",
        },
        {
            type: 'INTEGER',
            name: SortCommandParams.MAX_LEVEL,
            description: `Maximum level of items to be shown in results`,
        },
        {
            type: 'INTEGER',
            name: SortCommandParams.MIN_LEVEL,
            description: `Minimum level of items to be shown in results`,
        },
        {
            type: 'BOOLEAN',
            name: SortCommandParams.ASCENDING,
            description:
                'Whether to results should be shown in ascending order instead of descending order',
        },
        {
            type: 'STRING',
            name: 'char-id',
            description: "Only show items that are in a character's inventory",
        },
        ...getItemTagFilterOptions(),
    ];
}

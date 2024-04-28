import { PRETTY_ITEM_TYPES, PRETTY_TAG_NAMES } from '../../utils/itemTypeData';
import { ITEM_TAG_FILTER_OPTION_NAMES } from './constants';
import { SortCommandParams } from './types';
function getItemTagFilterOptions() {
    const itemTagFilterOptions = ITEM_TAG_FILTER_OPTION_NAMES.map(({ optionName, tag, }) => ({
        type: 'BOOLEAN',
        description: `Whether to include ${tag === 'none' ? 'untagged items' : ' items with ' + PRETTY_TAG_NAMES[tag] + ' tag'} in results`,
        name: optionName,
    }));
    const weakcoreOption = {
        type: 'BOOLEAN',
        description: 'Only show weakcore options (no DC/DM/Seasonal/Rare/Special Offer items)',
        name: 'weakcore',
    };
    return [weakcoreOption].concat(itemTagFilterOptions);
}
export function getSortCommandOptions() {
    const itemTypeChoiceValues = [
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
    const itemTypeChoiceList = itemTypeChoiceValues.map((itemTypeChoice) => ({
        name: itemTypeChoice === 'items' ? 'All Items' : PRETTY_ITEM_TYPES[itemTypeChoice],
        value: itemTypeChoice,
    }));
    return [
        {
            type: 'STRING',
            name: SortCommandParams.SORT_EXPRESSION,
            description: `Eg. "Ice", "Damage", "All + Health", "INT - (DEX + STR)", etc. Supports +, -, *, / operators`,
        },
        {
            type: 'STRING',
            name: SortCommandParams.ITEM_TYPE,
            description: 'The type of item to sort',
            choices: itemTypeChoiceList,
        },
        {
            type: 'STRING',
            name: SortCommandParams.WEAPON_ELEMENT,
            description: "Filter by weapon element. Only applicable if the selected item type is 'Weapon'",
        },
        {
            type: 'INTEGER',
            name: SortCommandParams.MAX_LEVEL,
            description: `Maximum level of items to be shown in results`,
        },
        {
            type: 'BOOLEAN',
            name: SortCommandParams.ASCENDING,
            description: 'Whether to results should be shown in ascending order instead of descending order',
        },
        {
            type: 'STRING',
            name: 'char-id',
            description: "Only show items that are in a character's inventory",
        },
        ...getItemTagFilterOptions(),
    ];
}
export function getSortCommandInputModal({ sortExpression }) {
    const modal = {
        customId: 'sort-filters',
        title: 'Sort options and filters',
        components: [
            {
                type: 'ACTION_ROW',
                components: [
                    {
                        customId: 'sort-expression',
                        type: 'TEXT_INPUT',
                        label: 'Sort Expression (+,-,*,/ operators allowed)',
                        required: true,
                        minLength: 2,
                        maxLength: 100,
                        value: sortExpression,
                        placeholder: 'Eg. Ice, Damage,  All + Health, DEX, (INT + DEX + STR) / 3, etc.',
                        style: 'SHORT',
                    },
                ],
            },
            {
                type: 'ACTION_ROW',
                components: [
                    {
                        customId: 'max-level',
                        type: 'TEXT_INPUT',
                        label: 'Max level of items to show',
                        minLength: 1,
                        maxLength: 2,
                        value: '90',
                        placeholder: 'Level between 0 and 90',
                        style: 'SHORT',
                    },
                ],
            },
            {
                type: 'ACTION_ROW',
                components: [
                    {
                        customId: 'weapon-element',
                        type: 'TEXT_INPUT',
                        label: 'Only show weapons of this element',
                        minLength: 1,
                        maxLength: 20,
                        placeholder: 'Weapon element to filter by',
                        style: 'SHORT',
                    },
                ],
            },
        ],
    };
    return modal;
}

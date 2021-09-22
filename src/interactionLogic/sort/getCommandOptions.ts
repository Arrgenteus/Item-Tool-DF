import {
    ApplicationCommandChoicesData,
    ApplicationCommandNonOptionsData,
    ApplicationCommandOptionData,
} from 'discord.js';
import { ItemTag, ItemTypes, PRETTY_TAG_NAMES } from '../../utils/itemTypeData';
import { ITEM_TAG_FILTER_OPTION_NAMES } from './constants';
import { SortableItemType, SortCommandParams } from './types';

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
            description: `Include ${
                tag === 'none' ? 'untagged items' : PRETTY_TAG_NAMES[tag] + ' tag'
            } in results?`,
            name: optionName,
        })
    );
}

function getSubCommandOptions(itemType: SortableItemType): ApplicationCommandOptionData {
    let formattedName: string;
    if (itemType === ItemTypes.CAPE) formattedName = 'capes/wings';
    else formattedName = itemType + 's';

    return {
        type: 'SUB_COMMAND',
        name: itemType,
        description: `Sort ${formattedName} by criteria`,
        options: [
            {
                type: 'STRING',
                name: SortCommandParams.SORT_EXPRESSION,
                required: true,
                description: `Eg. "${
                    itemType === ItemTypes.WEAPON ? 'Damage' : 'Ice'
                }", "All + Health", "INT - (DEX + STR)", etc. Can only contain + or - operators`,
            },
            ...((itemType === ItemTypes.WEAPON
                ? [
                      {
                          type: 'STRING',
                          name: SortCommandParams.WEAPON_ELEMENT,
                          description: 'Specific weapon element',
                      },
                  ]
                : []) as ApplicationCommandChoicesData[]),
            {
                type: 'INTEGER',
                name: SortCommandParams.MAX_LEVEL,
                description: `Max level to be shown`,
            },
            {
                type: 'INTEGER',
                name: SortCommandParams.MIN_LEVEL,
                description: `Min level to be shown`,
            },
            {
                type: 'BOOLEAN',
                name: SortCommandParams.ASCENDING,
                description: 'Show results in ascending order',
            },
            {
                type: 'STRING',
                name: 'char-id',
                description: "Filter by a character's inventory",
            },
            ...getItemTagFilterOptions(),
        ],
    };
}

export function getSortCommandOptions() {
    const itemTypeSubCommandNames: SortableItemType[] = [
        ItemTypes.BELT,
        ItemTypes.BRACER,
        ItemTypes.CAPE,
        ItemTypes.HELM,
        ItemTypes.NECKLACE,
        ItemTypes.RING,
        ItemTypes.TRINKET,
        ItemTypes.WEAPON,
    ];

    return itemTypeSubCommandNames.sort().map(getSubCommandOptions);
}

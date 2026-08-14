import {
    ApplicationCommandNonOptionsData,
    ApplicationCommandOptionChoiceData,
    ApplicationCommandOptionData,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { ItemTag, PRETTY_ITEM_TYPES, PRETTY_TAG_NAMES } from '../../utils/itemTypeData.js';
import { ITEM_TAG_FILTER_OPTION_NAMES } from './constants.js';
import { SortCommandParams, SortItemTypeOption } from './types.js';

function getItemTagFilterOptions(): ApplicationCommandNonOptionsData[] {
    const itemTagFilterOptions = ITEM_TAG_FILTER_OPTION_NAMES.map(
        ({
            optionName,
            tag,
        }: {
            optionName: SortCommandParams;
            tag: ItemTag;
        }): ApplicationCommandNonOptionsData => ({
            type: ApplicationCommandOptionType.Boolean,
            description: `Whether to include ${
                tag === 'none' ? 'untagged items' : ' items with ' + PRETTY_TAG_NAMES[tag] + ' tag'
            } in results`,
            name: optionName,
        })
    );

    const weakcoreOption: ApplicationCommandNonOptionsData = {
        type: ApplicationCommandOptionType.Boolean,
        description: 'Only show weakcore options (no DC/DM/Seasonal/Rare/Special Offer items)',
        name: 'weakcore',
    };

    return [weakcoreOption].concat(itemTagFilterOptions);
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

    const itemTypeChoiceList: ApplicationCommandOptionChoiceData<string>[] =
        itemTypeChoiceValues.map(
            (itemTypeChoice: SortItemTypeOption): ApplicationCommandOptionChoiceData<string> => ({
                name: itemTypeChoice === 'items' ? 'All Items' : PRETTY_ITEM_TYPES[itemTypeChoice],
                value: itemTypeChoice,
            })
        );

    return [
        {
            type: ApplicationCommandOptionType.String,
            name: SortCommandParams.SORT_EXPRESSION,
            description: `Eg. "Ice", "Damage", "All + Health", "INT - (DEX + STR)", etc. Supports +, -, *, / operators`,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: SortCommandParams.ITEM_TYPE,
            description: 'The type of item to sort',
            choices: itemTypeChoiceList,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: SortCommandParams.WEAPON_ELEMENT,
            description:
                "Filter by weapon element. Only applicable if the selected item type is 'Weapon'",
        },
        {
            type: ApplicationCommandOptionType.Integer,
            name: SortCommandParams.MAX_LEVEL,
            description: `Maximum level of items to be shown in results`,
        },
        {
            type: ApplicationCommandOptionType.Boolean,
            name: SortCommandParams.ASCENDING,
            description:
                'Whether to results should be shown in ascending order instead of descending order',
        },
        {
            type: ApplicationCommandOptionType.String,
            name: 'char-id',
            description: "Only show items that are in a character's inventory",
        },
        ...getItemTagFilterOptions(),
    ];
}

export function getSortCommandInputModal({ sortExpression }: { sortExpression?: string }) {
    const sortExpressionInput = new TextInputBuilder()
        .setCustomId('sort-expression')
        .setLabel('Sort Expression (+,-,*,/ operators allowed)')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(100)
        .setPlaceholder('Eg. Ice, Damage,  All + Health, DEX, (INT + DEX + STR) / 3, etc.')
        .setStyle(TextInputStyle.Short);
    if (sortExpression) sortExpressionInput.setValue(sortExpression);

    const maxLevelInput = new TextInputBuilder()
        .setCustomId('max-level')
        .setLabel('Max level of items to show')
        .setMinLength(1)
        .setMaxLength(2)
        .setValue('90')
        .setPlaceholder('Level between 0 and 90')
        .setStyle(TextInputStyle.Short);
    const weaponElementInput = new TextInputBuilder()
        .setCustomId('weapon-element')
        .setLabel('Only show weapons of this element')
        .setMinLength(1)
        .setMaxLength(20)
        .setPlaceholder('Weapon element to filter by')
        .setStyle(TextInputStyle.Short);

    return new ModalBuilder()
        .setCustomId('sort-filters')
        .setTitle('Sort options and filters')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(sortExpressionInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(maxLevelInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(weaponElementInput)
        );
}

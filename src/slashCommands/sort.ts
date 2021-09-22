import { ApplicationCommandOptionData, CommandInteraction } from 'discord.js';
import { ValidationError } from '../errors';
import { SlashCommandData } from '../eventHandlerTypes';
import getSortedItemList from '../interactionLogic/sort/getSortedItems';
import { parseSortExpression } from '../interactionLogic/sort/sortExpressionParser';
import {
    SortableItemType,
    SortCommandParams,
    SortExpressionData,
    SortSubCommand,
} from '../interactionLogic/sort/types';

const command: SlashCommandData = {
    preferEphemeralErrorMessage: true,
    structure: {
        name: 'sort',
        description:
            'Sort items by provided criteria. Returns a large response that only you can see.',
        options: [
            {
                type: 'SUB_COMMAND',
                name: SortSubCommand.WEAPON,
                description: 'Sort weapons by provided criteria.',
                options: [
                    {
                        type: 'STRING',
                        name: SortCommandParams.SORT_EXPRESSION,
                        required: true,
                        description:
                            'Eg. "Ice", "All + Health", "INT - (DEX + STR)", "Damage", etc. Can only contain + or - operators.',
                    },
                    {
                        type: 'STRING',
                        name: SortCommandParams.WEAPON_ELEMENT,
                        description: 'Optional filter for weapons of a specific element',
                    },
                    {
                        type: 'INTEGER',
                        name: SortCommandParams.MAX_LEVEL,
                        description: 'Maximum level of weapons to be shown in results',
                    },
                    {
                        type: 'INTEGER',
                        name: SortCommandParams.MIN_LEVEL,
                        description: 'Minumum level of weapons to be shown in results',
                    },
                    {
                        type: 'BOOLEAN',
                        name: SortCommandParams.ASCENDING,
                        description:
                            'Whether weapons should be displayed in ascending order. Order is descending by default.',
                    },
                ],
            },
            ...[
                SortSubCommand.CAPE,
                SortSubCommand.HELM,
                SortSubCommand.BELT,
                SortSubCommand.NECKLACE,
                SortSubCommand.RING,
                SortSubCommand.TRINKET,
                SortSubCommand.BRACER,
            ]
                .sort((a: SortSubCommand, b: SortSubCommand): number => (a > b ? 1 : -1))
                .map((name: SortSubCommand): ApplicationCommandOptionData => {
                    let formattedName: string;
                    if (name === SortSubCommand.CAPE) formattedName = 'capes/wings';
                    else formattedName = name.replace('-', ' ');
                    if (formattedName.slice(-1) !== 's') formattedName += 's';

                    return {
                        type: 'SUB_COMMAND',
                        name: name,
                        description: `Sort ${formattedName} by provided criteria.`,
                        options: [
                            {
                                type: 'STRING',
                                name: SortCommandParams.SORT_EXPRESSION,
                                required: true,
                                description:
                                    'Eg. "Ice", "All + Health", "INT - (DEX + STR)", etc. Can only contain + or - operators.',
                            },
                            {
                                type: 'INTEGER',
                                name: SortCommandParams.MAX_LEVEL,
                                description: `Maximum level of ${formattedName} to be shown in results`,
                            },
                            {
                                type: 'INTEGER',
                                name: SortCommandParams.MIN_LEVEL,
                                description: `Minimum level of ${formattedName} to be shown in results`,
                            },
                            {
                                type: 'BOOLEAN',
                                name: SortCommandParams.ASCENDING,
                                description: `Whether ${formattedName} should be displayed in ascending order. Order is descending by default.`,
                            },
                        ],
                    };
                }),
        ],
    },

    run: async (interaction: CommandInteraction) => {
        const commandUsed: string = interaction.options.getSubcommand(true);

        const sortExpression: SortExpressionData = parseSortExpression(
            interaction.options.getString(SortCommandParams.SORT_EXPRESSION, true)
        );
        const weaponElement: string | undefined =
            interaction.options.getString(SortCommandParams.WEAPON_ELEMENT) ?? undefined;
        if (weaponElement && weaponElement.length > 20) {
            throw new ValidationError(
                `Element name \`${weaponElement}\` is too long. It should be a maximum of 20 characters.`
            );
        }

        let minLevel: number | undefined =
            interaction.options.getInteger(SortCommandParams.MIN_LEVEL) ?? undefined;
        let maxLevel: number | undefined =
            interaction.options.getInteger(SortCommandParams.MAX_LEVEL) ?? undefined;
        if (minLevel !== undefined) minLevel = Math.min(Math.max(minLevel, 0), 90);
        if (maxLevel !== undefined) maxLevel = Math.min(Math.max(maxLevel, 0), 90);

        const sortedItems = await getSortedItemList({
            itemType: commandUsed as SortableItemType,
            sortExpression,
            weaponElement,
            minLevel,
            maxLevel,
            ascending: interaction.options.getBoolean(SortCommandParams.ASCENDING) ?? false,
        });

        await interaction.reply(sortedItems);
    },
};

export default command;

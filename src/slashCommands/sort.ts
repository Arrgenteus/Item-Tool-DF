import {
    ApplicationCommandOption,
    Collection,
    CommandInteraction,
    CommandInteractionOption,
} from 'discord.js';
import { ValidationError } from '../errors';
import { ApplicationCommandOptions, SlashCommandData } from '../commonTypes/commandStructures';
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
                type: ApplicationCommandOptions.SUB_COMMAND,
                name: SortSubCommand.WEAPON,
                description: 'Sort weapons by provided criteria.',
                options: [
                    {
                        type: ApplicationCommandOptions.STRING,
                        name: SortCommandParams.SORT_EXPRESSION,
                        required: true,
                        description:
                            'Eg. "Ice", "All + Health", "INT - (DEX + STR)", "Damage", etc. Can only contain + or - operators.',
                    },
                    {
                        type: ApplicationCommandOptions.STRING,
                        name: SortCommandParams.WEAPON_ELEMENT,
                        description: 'Optional filter for weapons of a specific element',
                    },
                    {
                        type: ApplicationCommandOptions.INTEGER,
                        name: SortCommandParams.MAX_LEVEL,
                        description: 'Maximum level of weapons to be shown in results',
                    },
                    {
                        type: ApplicationCommandOptions.INTEGER,
                        name: SortCommandParams.MIN_LEVEL,
                        description: 'Minumum level of weapons to be shown in results',
                    },
                    {
                        type: ApplicationCommandOptions.BOOLEAN,
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
            ].map((name: SortSubCommand): ApplicationCommandOption => {
                let formattedName: string;
                if (name === SortSubCommand.CAPE) formattedName = 'capes/wings';
                else formattedName = name.replace('-', ' ');
                if (formattedName.slice(-1) !== 's') formattedName += 's';

                return {
                    type: ApplicationCommandOptions.SUB_COMMAND,
                    name: name,
                    description: `Sort ${formattedName} by provided criteria.`,
                    options: [
                        {
                            type: ApplicationCommandOptions.STRING,
                            name: SortCommandParams.SORT_EXPRESSION,
                            required: true,
                            description:
                                'Eg. "Ice", "All + Health", "INT - (DEX + STR)", etc. Can only contain + or - operators.',
                        },
                        {
                            type: ApplicationCommandOptions.INTEGER,
                            name: SortCommandParams.MAX_LEVEL,
                            description: `Maximum level of ${formattedName} to be shown in results`,
                        },
                        {
                            type: ApplicationCommandOptions.INTEGER,
                            name: SortCommandParams.MIN_LEVEL,
                            description: `Minimum level of ${formattedName} to be shown in results`,
                        },
                        {
                            type: ApplicationCommandOptions.BOOLEAN,
                            name: SortCommandParams.ASCENDING,
                            description: `Whether ${formattedName} should be displayed in ascending order. Order is descending by default.`,
                        },
                    ],
                };
            }),
        ].sort((a: ApplicationCommandOption, b: ApplicationCommandOption) =>
            a.name > b.name ? 1 : -1
        ),
    },

    run: async (interaction: CommandInteraction) => {
        const commandUsed: CommandInteractionOption = interaction.options.first()!;
        const options: Collection<string, CommandInteractionOption> = commandUsed.options!;

        const sortExpression: SortExpressionData = parseSortExpression(
            options.get(SortCommandParams.SORT_EXPRESSION)!.value as string
        );
        const weaponElement = options.get(SortCommandParams.WEAPON_ELEMENT)?.value as
            | string
            | undefined;
        if (weaponElement && weaponElement.length > 20)
            throw new ValidationError(
                `Element name \`${weaponElement}\` is too long. It should be a maximum of 20 characters.`
            );

        let minLevel = options.get(SortCommandParams.MIN_LEVEL)?.value as number | undefined;
        let maxLevel = options.get(SortCommandParams.MAX_LEVEL)?.value as number | undefined;
        if (minLevel !== undefined) minLevel = Math.min(Math.max(minLevel, 0), 90);
        if (maxLevel !== undefined) maxLevel = Math.min(Math.max(maxLevel, 0), 90);

        const sortedItems = await getSortedItemList(1, {
            itemType: commandUsed.name as SortableItemType,
            sortExpression,
            weaponElement,
            minLevel,
            maxLevel,
            ascending: options.get(SortCommandParams.ASCENDING)?.value as boolean,
        });
        await interaction.reply(sortedItems);
    },
};

export default command;

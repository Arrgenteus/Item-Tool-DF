import { ApplicationCommandOption, Collection, CommandInteractionOption } from 'discord.js';
import { ValidationError } from '../errors';
import { ApplicationCommandOptions, SlashCommandData } from '../commonTypes/commandStructures';
import getSortedItemList from '../interactionLogic/sort/getSortedItems';
import parseSortExpression from '../interactionLogic/sort/sortExpressionParser';
import {
    SortCommandParams,
    SortExpressionData,
    SortSubCommand,
} from '../interactionLogic/sort/types';

export const command: SlashCommandData = {
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
                        description: 'Minumum level of items to be shown in results',
                    },
                ],
            },
            ...[
                SortSubCommand.ALL,
                SortSubCommand.CAPE,
                SortSubCommand.HELM,
                SortSubCommand.BELT,
                SortSubCommand.NECKLACE,
                SortSubCommand.RING,
                SortSubCommand.TRINKET,
                SortSubCommand.BRACER,
            ].map((name: SortSubCommand): ApplicationCommandOption => {
                let formattedName;
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
                            description: 'Maximum level of weapons to be shown in results',
                        },
                        {
                            type: ApplicationCommandOptions.INTEGER,
                            name: SortCommandParams.MIN_LEVEL,
                            description: 'Minimum level of items to be shown in results',
                        },
                    ],
                };
            }),
        ].sort((a: ApplicationCommandOption, b: ApplicationCommandOption) =>
            a.name > b.name ? 1 : -1
        ),
    },

    // TODO: Fix types here
    run: async (interaction: any) => {
        const command = interaction.options.first();
        const options: Collection<string, CommandInteractionOption> = command.options;

        const sortExpression: SortExpressionData = parseSortExpression(
            options.get(SortCommandParams.SORT_EXPRESSION)!.value as string
        );
        const weaponElement = options.get(SortCommandParams.WEAPON_ELEMENT)?.value as
            | string
            | undefined;
        if (weaponElement && weaponElement.length > 100)
            throw new ValidationError(
                `Element name \`${weaponElement}\` is too long. It should be a maximum of 100 characters.`
            );
        console.log(
            `${interaction.user.tag} used /sort ${command.name} ${sortExpression.baseExpression}`
        );
        await interaction.defer({ ephemeral: true });
        const sortedItems = await getSortedItemList(command.name, {
            sortExpression,
            weaponElement,
            minLevel: options.get(SortCommandParams.MIN_LEVEL)?.value as number,
            maxLevel: options.get(SortCommandParams.MIN_LEVEL)?.value as number,
        });
        await interaction.editReply({ embeds: sortedItems });
    },
};

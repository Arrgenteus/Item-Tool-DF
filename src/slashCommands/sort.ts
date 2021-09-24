import { CommandInteraction } from 'discord.js';
import { ValidationError } from '../errors';
import { SlashCommandData } from '../eventHandlerTypes';
import { ITEM_TAG_FILTER_OPTION_NAMES } from '../interactionLogic/sort/constants';
import { getSortCommandOptions } from '../interactionLogic/sort/getCommandOptions';
import getSortedItemList from '../interactionLogic/sort/getSortedItems';
import { parseSortExpression } from '../interactionLogic/sort/sortExpressionParser';
import {
    SortableItemType,
    SortCommandParams,
    SortExpressionData,
} from '../interactionLogic/sort/types';
import { ItemTag } from '../utils/itemTypeData';

const command: SlashCommandData = {
    preferEphemeralErrorMessage: true,
    structure: {
        name: 'sort',
        description: 'Sort items by provided criteria',
        options: getSortCommandOptions(),
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

        const charID: string | undefined =
            interaction.options.getString(SortCommandParams.CHAR_ID) ?? undefined;

        let minLevel: number | undefined =
            interaction.options.getInteger(SortCommandParams.MIN_LEVEL) ?? undefined;
        let maxLevel: number | undefined =
            interaction.options.getInteger(SortCommandParams.MAX_LEVEL) ?? undefined;
        if (minLevel !== undefined) minLevel = Math.min(Math.max(minLevel, 0), 90);
        if (maxLevel !== undefined) maxLevel = Math.min(Math.max(maxLevel, 0), 90);

        const excludeTags: Set<ItemTag> = new Set();
        for (const { optionName, tag } of ITEM_TAG_FILTER_OPTION_NAMES) {
            if (interaction.options.getBoolean(optionName) === false) excludeTags.add(tag);
        }

        const sortedItems = await getSortedItemList({
            itemType: commandUsed as SortableItemType,
            sortExpression,
            weaponElement,
            minLevel,
            maxLevel,
            charID,
            excludeTags,
            ascending: interaction.options.getBoolean(SortCommandParams.ASCENDING) === true,
        });

        await interaction.reply(sortedItems);
    },
};

export default command;

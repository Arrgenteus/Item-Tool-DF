import { CommandInteraction } from 'discord.js';
import config from '../config';
import { ValidationError } from '../errors';
import { SlashCommandData } from '../eventHandlerTypes';
import { ITEM_TAG_FILTER_OPTION_NAMES } from '../interactionLogic/sort/constants';
import { getSortCommandOptions } from '../interactionLogic/sort/getCommandOptions';
import { getSortResultsMessage } from '../interactionLogic/sort/getSortedItemsResponse';
import { parseSortExpression } from '../interactionLogic/sort/sortExpressionParser';
import {
    SortCommandParams,
    SortExpressionData,
    SortItemTypeOption,
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

        const itemTypeInput: SortItemTypeOption = interaction.options.getString(
            SortCommandParams.ITEM_TYPE,
            true
        ) as SortItemTypeOption;

        const filters = {
            sortExpression,
            weaponElement,
            minLevel,
            maxLevel,
            charID,
            excludeTags,
            ascending: interaction.options.getBoolean(SortCommandParams.ASCENDING) === true,
        };

        const shouldDisplayShortResult: boolean =
            !interaction.channel ||
            !(config.LONG_RESULT_CHANNELS || []).includes(interaction.channel.id);

        const sortedItemMessage = await getSortResultsMessage(
            itemTypeInput,
            filters,
            shouldDisplayShortResult
        );

        await interaction.reply(sortedItemMessage);
    },
};

export default command;

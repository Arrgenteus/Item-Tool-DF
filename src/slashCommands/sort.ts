import { CommandInteraction } from 'discord.js';
import config from '../config';
import { ValidationError } from '../errors';
import { SlashCommandData } from '../eventHandlerTypes';
import { ITEM_TAG_FILTER_OPTION_NAMES } from '../interactionLogic/sort/constants';
import {
    getSortCommandInputModal,
    getSortCommandOptions,
} from '../interactionLogic/sort/commandOptions';
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
        let inputSortExpression: string | undefined =
            interaction.options.getString(SortCommandParams.SORT_EXPRESSION) ?? undefined;
        let itemTypeInput: SortItemTypeOption =
            (interaction.options.getString(
                SortCommandParams.ITEM_TYPE
            ) as SortItemTypeOption | null) ?? 'items';
        let maxLevel: number | undefined =
            interaction.options.getInteger(SortCommandParams.MAX_LEVEL) ?? undefined;
        if (maxLevel !== undefined) maxLevel = Math.min(Math.max(maxLevel, 0), 90);

        const weaponElement: string | undefined =
            interaction.options.getString(SortCommandParams.WEAPON_ELEMENT) ?? undefined;
        if (weaponElement && weaponElement.length > 20) {
            throw new ValidationError(
                `Element name \`${weaponElement}\` is too long. It should be a maximum of 20 characters.`
            );
        }

        if (!inputSortExpression) {
            const inputModal = getSortCommandInputModal({});
            await interaction.showModal(inputModal);
            return;
        }

        const parsedSortExpression: SortExpressionData = parseSortExpression(inputSortExpression);

        const charID: string | undefined =
            interaction.options.getString(SortCommandParams.CHAR_ID) ?? undefined;

        const excludeTags: Set<ItemTag> = new Set();
        for (const { optionName, tag } of ITEM_TAG_FILTER_OPTION_NAMES) {
            if (interaction.options.getBoolean(optionName) === false) excludeTags.add(tag);
        }

        const filters = {
            sortExpression: parsedSortExpression,
            weaponElement: weaponElement?.toLowerCase(),
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

import { ButtonInteraction, Message, MessageOptions } from 'discord.js';
import { ActionRowInteractionData } from '../eventHandlerTypes';
import getSortedItemList from '../interactionLogic/sort/getSortedItems';
import { getFiltersFromEmbed } from '../interactionLogic/sort/queryBuilder';
import { SortFilterParams } from '../interactionLogic/sort/types';
import { INTERACTION_ID_ARG_SEPARATOR } from '../utils/constants';

const buttonInteration: ActionRowInteractionData = {
    names: ['prev-page-sort-results', 'next-page-sort-results'],
    preferEphemeralErrorMessage: true,
    run: async (
        interaction: ButtonInteraction,
        handlerName: 'prev-page-sort-results' | 'next-page-sort-results'
    ): Promise<void> => {
        const [, valueLimit]: string[] = interaction.customId.split(INTERACTION_ID_ARG_SEPARATOR);
        const usedFilters: SortFilterParams = getFiltersFromEmbed(
            interaction.message.embeds[0].title!,
            interaction.message.embeds[0].description ?? undefined
        );
        if (handlerName === 'next-page-sort-results') {
            usedFilters.nextPageValueLimit = Number(valueLimit);
        } else {
            usedFilters.prevPageValueLimit = Number(valueLimit);
        }

        const sortedItems: MessageOptions = await getSortedItemList(usedFilters);
        if (interaction.message instanceof Message && interaction.message.flags?.has('EPHEMERAL')) {
            await interaction.update(sortedItems);
        } else {
            await interaction.reply({ ...sortedItems, ephemeral: true });
        }
    },
};

export default buttonInteration;

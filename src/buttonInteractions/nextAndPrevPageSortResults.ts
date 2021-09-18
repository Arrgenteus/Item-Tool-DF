import { ButtonInteraction, Message, MessageOptions } from 'discord.js';
import { ButtonInteractionData } from '../eventHandlerTypes';
import getSortedItemList from '../interactionLogic/sort/getSortedItems';
import { getFiltersFromEmbed } from '../interactionLogic/sort/paginationHelpers';
import { SortableItemType, SortFilterParams } from '../interactionLogic/sort/types';
import { BUTTON_ID_ARG_SEPARATOR } from '../utils/constants';

const buttonInteration: ButtonInteractionData = {
    names: ['prev-page-sort-results', 'next-page-sort-results'],
    preferEphemeralErrorMessage: true,
    run: async (
        interaction: ButtonInteraction,
        handlerName: 'prev-page-sort-results' | 'next-page-sort-results'
    ): Promise<void> => {
        const [, itemType, valueLimit]: string[] =
            interaction.customId.split(BUTTON_ID_ARG_SEPARATOR);
        const usedFilters: SortFilterParams = getFiltersFromEmbed(
            interaction.message.embeds[0].title!,
            interaction.message.embeds[0].description!,
            itemType as SortableItemType
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

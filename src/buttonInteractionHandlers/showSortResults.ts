import { ButtonInteraction, MessageOptions } from 'discord.js';
import { ButtonInteractionData } from '../eventHandlerTypes';
import getSortedItemList from '../interactionLogic/sort/getSortedItems';
import { getFiltersFromEmbed } from '../interactionLogic/sort/queryBuilder';
import { SortableItemType, SortFilterParams } from '../interactionLogic/sort/types';
import { BUTTON_ID_ARG_SEPARATOR } from '../utils/constants';

const buttonInteration: ButtonInteractionData = {
    names: ['show-sort-results'],
    preferEphemeralErrorMessage: true,
    run: async (interaction: ButtonInteraction): Promise<void> => {
        const [, itemType]: string[] = interaction.customId.split(BUTTON_ID_ARG_SEPARATOR);
        const usedFilters: SortFilterParams = getFiltersFromEmbed(
            interaction.message.embeds[0].title!,
            interaction.message.embeds[0].description ?? undefined,
            itemType as SortableItemType
        );

        const sortedItems: MessageOptions = await getSortedItemList(usedFilters);
        await interaction.reply({ ...sortedItems, ephemeral: true });
    },
};

export default buttonInteration;

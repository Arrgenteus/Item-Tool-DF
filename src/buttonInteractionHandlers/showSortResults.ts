import { ButtonInteraction, MessageOptions } from 'discord.js';
import { ActionRowInteractionData } from '../eventHandlerTypes';
import getSortedItemList from '../interactionLogic/sort/getSortedItems';
import { getFiltersFromEmbed } from '../interactionLogic/sort/queryBuilder';
import { SortableItemType, SortFilterParams } from '../interactionLogic/sort/types';

const buttonInteration: ActionRowInteractionData = {
    names: ['show-sort-results'],
    preferEphemeralErrorMessage: true,
    run: async (interaction: ButtonInteraction, args: string[]): Promise<void> => {
        const [itemType]: string[] = args;
        const usedFilters: SortFilterParams = getFiltersFromEmbed(
            interaction.message.embeds[0].title!,
            interaction.message.embeds[0].description ?? undefined,
            undefined,
            itemType as SortableItemType
        );

        const sortedItems: MessageOptions = await getSortedItemList(usedFilters);
        await interaction.reply({ ...sortedItems, ephemeral: true });
    },
};

export default buttonInteration;

import { Message, MessageOptions, SelectMenuInteraction } from 'discord.js';
import { ActionRowInteractionData } from '../eventHandlerTypes';
import { SORT_ACTIONS } from '../interactionLogic/sort/constants';
import getSortedItemList from '../interactionLogic/sort/getSortedItems';
import { getFiltersFromEmbed } from '../interactionLogic/sort/queryBuilder';
import { SortFilterParams } from '../interactionLogic/sort/types';
import { ItemTag } from '../utils/itemTypeData';

const buttonInteration: ActionRowInteractionData = {
    names: [SORT_ACTIONS.TAG_SELECTION],
    preferEphemeralErrorMessage: true,
    run: async (interaction: SelectMenuInteraction): Promise<void> => {
        const usedFilters: SortFilterParams = getFiltersFromEmbed(
            interaction.message.embeds[0].title!,
            interaction.message.embeds[0].description ?? undefined,
            interaction.values as ItemTag[]
        );
        const sortedItems: MessageOptions = await getSortedItemList(usedFilters);
        if (interaction.message instanceof Message && interaction.message.flags?.has('EPHEMERAL')) {
            await interaction.update(sortedItems);
        } else {
            await interaction.reply({ ...sortedItems, ephemeral: true });
        }
    },
};

export default buttonInteration;

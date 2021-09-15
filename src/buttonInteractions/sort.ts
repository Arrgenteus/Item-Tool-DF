import { ButtonInteraction } from 'discord.js';
import { ButtonInteractionData } from '../eventHandlerTypes';
import getSortedItemList from '../interactionLogic/sort/getSortedItems';
import { uncompressSortFilters } from '../interactionLogic/sort/sortFilterCompression';

const buttonInteration: ButtonInteractionData = {
    // sort, sort small
    names: ['s', 'ss'],
    preferEphemeralErrorMessage: true,
    run: async (interaction: ButtonInteraction, handlerName: 's' | 'ss'): Promise<void> => {
        const sortFilters = uncompressSortFilters(
            interaction.customId.slice(handlerName.length + 1)
        );
        const sortedItems = await getSortedItemList(handlerName === 'ss' ? 1 : 10, sortFilters);

        await interaction.reply(Object.assign(sortedItems, { ephemeral: true }));
    },
};

export default buttonInteration;

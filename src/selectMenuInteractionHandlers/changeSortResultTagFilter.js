import { Message, } from 'discord.js';
import { SORT_ACTIONS } from '../interactionLogic/sort/constants';
import { getSortResultsMessageUsingMessageFilters } from '../interactionLogic/sort/getSortedItemsResponse';
export const changeSortResultTagFilterSelectMenu = {
    names: [SORT_ACTIONS.TAG_SELECTION],
    preferEphemeralErrorMessage: true,
    run: async (interaction) => {
        const sortedItemMessage = await getSortResultsMessageUsingMessageFilters(interaction.message.embeds[0].title, interaction.message.embeds[0].description ?? undefined, interaction.values);
        if (interaction.message instanceof Message &&
            (interaction.user.id === interaction.message.interaction?.user.id ||
                interaction.message.flags?.has('EPHEMERAL'))) {
            await interaction.update(sortedItemMessage);
        }
        else {
            sortedItemMessage.ephemeral = true;
            await interaction.reply(sortedItemMessage);
        }
    },
};

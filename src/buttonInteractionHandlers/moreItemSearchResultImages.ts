import { ButtonInteraction, MessageEmbedOptions } from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes.js';
import { getAllItemImages } from '../interactionLogic/search/search.js';
import {
    MORE_SEARCH_RESULT_IMAGES_INTERACTION_ID,
    SearchableItemCategory,
} from '../interactionLogic/search/types.js';

export const moreItemSearchResultImagesButton: NonCommandInteractionData = {
    names: [MORE_SEARCH_RESULT_IMAGES_INTERACTION_ID],
    preferEphemeralErrorMessage: true,
    run: async (interaction: ButtonInteraction, args: string[]): Promise<void> => {
        const [itemName, itemSearchCategory, maxLevelInput, minLevelInput]: string[] = args;

        const maxLevel = maxLevelInput === '' ? undefined : Number(maxLevelInput);
        const minLevel = minLevelInput === '' ? undefined : Number(minLevelInput);

        const moreSearchResultImagesEmbeds: MessageEmbedOptions[] = await getAllItemImages({
            itemName,
            itemSearchCategory: itemSearchCategory as SearchableItemCategory,
            maxLevel,
            minLevel,
        });

        await interaction.reply({
            embeds: moreSearchResultImagesEmbeds,
            ephemeral: true,
        });
    },
};

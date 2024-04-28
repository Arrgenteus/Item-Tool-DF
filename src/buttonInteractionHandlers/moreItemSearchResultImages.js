import { getAllItemImages } from '../interactionLogic/search/search';
import { MORE_SEARCH_RESULT_IMAGES_INTERACTION_ID, } from '../interactionLogic/search/types';
export const moreItemSearchResultImagesButton = {
    names: [MORE_SEARCH_RESULT_IMAGES_INTERACTION_ID],
    preferEphemeralErrorMessage: true,
    run: async (interaction, args) => {
        const [itemName, itemSearchCategory, maxLevelInput, minLevelInput] = args;
        const maxLevel = maxLevelInput === '' ? undefined : Number(maxLevelInput);
        const minLevel = minLevelInput === '' ? undefined : Number(minLevelInput);
        const moreSearchResultImagesEmbeds = await getAllItemImages({
            itemName,
            itemSearchCategory: itemSearchCategory,
            maxLevel,
            minLevel,
        });
        await interaction.reply({
            embeds: moreSearchResultImagesEmbeds,
            ephemeral: true,
        });
    },
};

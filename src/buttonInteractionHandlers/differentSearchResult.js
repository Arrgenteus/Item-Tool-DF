import { Message, } from 'discord.js';
import { deleteMoreImagesButtonInButtonList, replaceSimilarResultWithCurrentResultInButtonList, updateMoreImagesButtonInButtonList, } from '../interactionLogic/search/formattedResults';
import { getSearchResultMessage } from '../interactionLogic/search/search';
import { DIFFERENT_SEARCH_RESULT_INTERACTION_ID, } from '../interactionLogic/search/types';
export const differentItemSearchResultButton = {
    names: [DIFFERENT_SEARCH_RESULT_INTERACTION_ID],
    preferEphemeralErrorMessage: true,
    run: async (interaction, args) => {
        const [userId, otherResultName, itemSearchCategory, maxLevelInput, minLevelInput,] = args;
        const maxLevel = maxLevelInput === '' ? undefined : Number(maxLevelInput);
        const minLevel = minLevelInput === '' ? undefined : Number(minLevelInput);
        const noResultMessage = {
            embeds: [
                { description: `No ${itemSearchCategory} was found. This is likely an error.` },
            ],
            components: [],
            ephemeral: true,
        };
        const itemSearchResult = await getSearchResultMessage({
            term: otherResultName,
            itemSearchCategory: itemSearchCategory,
            maxLevel,
            minLevel,
        });
        if (!itemSearchResult) {
            await interaction.reply(noResultMessage);
            return;
        }
        itemSearchResult.message.components = itemSearchResult.message.components ?? [];
        if (userId === interaction.user.id ||
            (interaction.message instanceof Message && interaction.message.flags?.has('EPHEMERAL'))) {
            const currentSearchItemName = interaction.message.embeds[0].title;
            itemSearchResult.message.components = [
                ...(interaction.message.components ?? []),
            ];
            if (itemSearchResult.hasMultipleImages) {
                updateMoreImagesButtonInButtonList({
                    itemName: otherResultName,
                    itemSearchCategory: itemSearchCategory,
                    maxLevel,
                    minLevel,
                    messageComponents: itemSearchResult.message.components,
                });
            }
            else {
                deleteMoreImagesButtonInButtonList(itemSearchResult.message.components);
            }
            replaceSimilarResultWithCurrentResultInButtonList({
                itemNameToReplace: otherResultName,
                itemNameReplacement: currentSearchItemName,
                messageComponents: itemSearchResult.message.components,
            });
            await interaction.update(itemSearchResult.message);
        }
        else {
            if (itemSearchResult.hasMultipleImages) {
                updateMoreImagesButtonInButtonList({
                    itemName: otherResultName,
                    itemSearchCategory: itemSearchCategory,
                    maxLevel,
                    minLevel,
                    messageComponents: itemSearchResult.message.components,
                });
            }
            itemSearchResult.message.ephemeral = true;
            await interaction.reply(itemSearchResult.message);
        }
    },
};

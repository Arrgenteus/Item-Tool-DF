import { ButtonInteraction, InteractionReplyOptions, Message, MessageActionRow } from 'discord.js';
import { ActionRowInteractionData } from '../eventHandlerTypes';
import { replaceSimilarResultWithCurrentResultInButtonList } from '../interactionLogic/search/formattedResults';
import { getItemSearchResult } from '../interactionLogic/search/search';
import {
    DIFFERENT_SEARCH_RESULT_INTERACTION_ID,
    SearchableItemCategory,
} from '../interactionLogic/search/types';

const buttonInteration: ActionRowInteractionData = {
    names: [DIFFERENT_SEARCH_RESULT_INTERACTION_ID],
    preferEphemeralErrorMessage: true,
    run: async (interaction: ButtonInteraction, args: string[]): Promise<void> => {
        const [
            userId,
            otherResultName,
            itemSearchCategory,
            maxLevelInput,
            minLevelInput,
        ]: string[] = args;

        const maxLevel = maxLevelInput === '' ? undefined : Number(maxLevelInput);
        const minLevel = minLevelInput === '' ? undefined : Number(minLevelInput);

        const noResultMessage: InteractionReplyOptions = {
            embeds: [
                { description: `No ${itemSearchCategory} was found. This is likely an error.` },
            ],
            components: [],
            ephemeral: true,
        };
        const itemSearchResult: InteractionReplyOptions | undefined = await getItemSearchResult({
            term: otherResultName,
            itemSearchCategory: itemSearchCategory as SearchableItemCategory,
            maxLevel,
            minLevel,
        });

        if (
            itemSearchResult &&
            (userId === interaction.user.id ||
                (interaction.message instanceof Message &&
                    interaction.message.flags?.has('EPHEMERAL')))
        ) {
            const currentSearchItemName: string = interaction.message.embeds[0].title!;

            itemSearchResult.components = interaction.message.components as
                | MessageActionRow[]
                | undefined;
            replaceSimilarResultWithCurrentResultInButtonList({
                itemNameToReplace: otherResultName,
                itemNameReplacement: currentSearchItemName,
                messageComponents: itemSearchResult.components,
            });
            await interaction.update(itemSearchResult);
        } else {
            const reply = itemSearchResult ?? noResultMessage;
            reply.ephemeral = true;
            await interaction.reply(reply);
        }
    },
};

export default buttonInteration;

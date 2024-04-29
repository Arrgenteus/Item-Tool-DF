import { ApplicationCommandOptionChoiceData, AutocompleteInteraction } from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes.js';
import { fetchAutocompleteItemResults } from '../interactionLogic/search/search.js';
import { SearchableItemCategory } from '../interactionLogic/search/types.js';
import { compareCommandCategoryList } from '../interactionLogic/search/commandOptions.js';

export const compareCommandAutocomplete: NonCommandInteractionData = {
    names: compareCommandCategoryList.map((category) => 'compare-' + category),
    preferEphemeralErrorMessage: true,
    run: async (interaction: AutocompleteInteraction, args, handlerName: string): Promise<void> => {
        const autocompleteChoices: ApplicationCommandOptionChoiceData[] =
            await fetchAutocompleteItemResults({
                term: interaction.options.getFocused(),
                itemSearchCategory:
                    handlerName === 'compare-weapon'
                        ? 'weapon'
                        : (handlerName.slice('compare-'.length) as SearchableItemCategory),
            });

        await interaction.respond(autocompleteChoices);
    },
};

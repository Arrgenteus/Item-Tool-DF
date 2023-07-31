import { ApplicationCommandOptionChoiceData, AutocompleteInteraction } from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes';
import { fetchAutocompleteItemResults } from '../interactionLogic/search/search';
import { SearchableItemCategory } from '../interactionLogic/search/types';
import { compareCommandCategoryList } from '../interactionLogic/search/commandOptions';

const itemNameAutocompleteInteration: NonCommandInteractionData = {
    names: compareCommandCategoryList.map((category) => 'compare-' + category),
    preferEphemeralErrorMessage: true,
    run: async (interaction: AutocompleteInteraction, args, handlerName: string): Promise<void> => {
        const autocompleteChoices: ApplicationCommandOptionChoiceData[] =
            await fetchAutocompleteItemResults({
                term: interaction.options.getFocused(),
                itemSearchCategory:
                    handlerName === 'compare-wep'
                        ? 'weapon'
                        : (handlerName.slice('compare-'.length) as SearchableItemCategory),
            });

        await interaction.respond(autocompleteChoices);
    },
};

export default itemNameAutocompleteInteration;

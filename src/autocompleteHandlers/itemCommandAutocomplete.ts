import { ApplicationCommandOptionChoiceData, AutocompleteInteraction } from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes.js';
import { fetchAutocompleteItemResults } from '../interactionLogic/search/search.js';
import {
    SearchableItemCategory,
    SearchableItemCategoryAlias,
} from '../interactionLogic/search/types.js';
import { unaliasItemType } from '../interactionLogic/search/utils.js';
import { searchCommandOptions } from '../interactionLogic/search/commandOptions.js';

export const itemCommandAutocomplete: NonCommandInteractionData = {
    names: searchCommandOptions,
    preferEphemeralErrorMessage: true,
    run: async (
        interaction: AutocompleteInteraction,
        args,
        handlerName: SearchableItemCategoryAlias
    ): Promise<void> => {
        const searchableItemCategory: SearchableItemCategory = unaliasItemType(handlerName);
        const maxLevel: number | undefined =
            interaction.options.getInteger('max-level') ?? undefined;
        const autocompleteChoices: ApplicationCommandOptionChoiceData[] =
            await fetchAutocompleteItemResults({
                term: interaction.options.getFocused(),
                itemSearchCategory: searchableItemCategory,
                maxLevel,
            });

        await interaction.respond(autocompleteChoices);
    },
};

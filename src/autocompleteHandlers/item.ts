import { ApplicationCommandOptionChoiceData, AutocompleteInteraction } from 'discord.js';
import { InteractionResponseTypes } from 'discord.js/typings/enums';
import { NonCommandInteractionData } from '../eventHandlerTypes';
import { fetchAutocompleteItemResults } from '../interactionLogic/search/search';
import {
    SearchableItemCategory,
    SearchableItemCategoryAlias,
} from '../interactionLogic/search/types';
import { unaliasItemType } from '../interactionLogic/search/utils';

const commandNames: (SearchableItemCategory | SearchableItemCategoryAlias)[] = [
    'item',
    'wep',
    'sword',
    'axe',
    'mace',
    'staff',
    'wand',
    'dagger',
    'scythe',
    'acc',
    'cape',
    'helm',
    'belt',
    'necklace',
    'ring',
    'trinket',
    'bracer',
    'cosmetic',
];

const itemNameAutocompleteInteration: NonCommandInteractionData = {
    names: commandNames,
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

        // TODO: Replace the below code with the interaction.respond method once a hotfix is released,
        //  since it is currently bugged
        if (interaction.responded) throw new Error('INTERACTION_ALREADY_REPLIED');

        // @ts-ignore
        await interaction.client.api.interactions(interaction.id, interaction.token).callback.post({
            data: {
                type: InteractionResponseTypes.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
                data: { choices: autocompleteChoices },
            },
            auth: false,
        });
        interaction.responded = true;
    },
};

export default itemNameAutocompleteInteration;

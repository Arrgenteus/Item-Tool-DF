import { CommandInteraction, MessageEmbedOptions } from 'discord.js';
import { SlashCommandData } from '../eventHandlerTypes';
import { getPetSearchResult } from '../interactionLogic/search/pets';

const command: SlashCommandData = {
    preferEphemeralErrorMessage: true,
    structure: {
        name: 'pet',
        description: 'Search for a pet by name',
        options: [
            {
                type: 'STRING',
                name: 'name',
                required: true,
                description: 'The pet name to search for.',
            },
            {
                type: 'INTEGER',
                name: 'max-level',
                description: 'The maximum pet level to return in results. Is 90 by default.',
            },
        ],
    },

    run: async (interaction: CommandInteraction) => {
        const searchQuery: string = interaction.options.getString('name', true);
        const maxLevel: number | undefined =
            interaction.options.getInteger('max-level') ?? undefined;

        const petSearchResult: { message: MessageEmbedOptions; noResults: boolean } =
            await getPetSearchResult(searchQuery, maxLevel);

        await interaction.reply({
            embeds: [petSearchResult.message],
            ephemeral: petSearchResult.noResults,
        });
    },
};

export default command;

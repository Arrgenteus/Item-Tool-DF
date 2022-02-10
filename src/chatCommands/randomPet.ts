import { Message, MessageEmbedOptions, TextChannel } from 'discord.js';
import { ChatCommandData } from '../eventHandlerTypes';
import { getRandomPet } from '../interactionLogic/search/pets';

const command: ChatCommandData = {
    names: ['randompet', 'random-pet'],
    run: async (message: Message): Promise<void> => {
        const channel: TextChannel = message.channel as TextChannel;

        const { message: randomPetSearchResult }: { message: MessageEmbedOptions } =
            await getRandomPet();

        await channel.send({ embeds: [randomPetSearchResult] });
    },
};

export default command;

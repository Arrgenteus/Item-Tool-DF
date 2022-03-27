import { Message, MessageEmbedOptions, TextChannel } from 'discord.js';
import { ChatCommandData } from '../eventHandlerTypes';
import { getRandomItem } from '../interactionLogic/search/random';
import { SearchableItemCategory } from '../interactionLogic/search/types';
import { ACCESSORY_TYPES } from '../utils/itemTypeData';

const command: ChatCommandData = {
    names: [
        'randompet',
        'random-pet',
        'randomacc',
        'random-acc',
        'randomhelm',
        'random-helm',
        'randomcape',
        'random-cape',
        'randombelt',
        'random-belt',
        'randomnecklace',
        'random-necklace',
        'randomring',
        'random-ring',
        'randomtrinket',
        'random-trinket',
        'randombracer',
        'random-bracer',
    ],
    run: async (message: Message, commandName: string): Promise<void> => {
        const channel: TextChannel = message.channel as TextChannel;

        const itemTypeInput: string = commandName.replace(/random\-?/, '');
        let itemType: SearchableItemCategory | undefined;
        if (itemTypeInput in ACCESSORY_TYPES || itemTypeInput === 'pet') {
            itemType = itemTypeInput as SearchableItemCategory;
        } else {
            itemType = 'accessory';
        }

        const { message: randomPetSearchResult }: { message: MessageEmbedOptions } =
            await getRandomItem(itemType);

        await channel.send({ embeds: [randomPetSearchResult] });
    },
};

export default command;

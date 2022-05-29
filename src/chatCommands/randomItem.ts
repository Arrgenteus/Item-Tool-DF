import { Message, MessageEmbedOptions, TextChannel } from 'discord.js';
import { ChatCommandData } from '../eventHandlerTypes';
import { getRandomItem } from '../interactionLogic/search/random';
import {
    SearchableItemCategory,
    SearchableItemCategoryAlias,
} from '../interactionLogic/search/types';
import { unaliasItemType } from '../interactionLogic/search/utils';
import { ACCESSORY_TYPES } from '../utils/itemTypeData';

const command: ChatCommandData = {
    names: [
        'randomitem',
        'random-item',
        'randomwep',
        'random-wep',
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
    run: async (message: Message, args: string, commandName: string): Promise<void> => {
        const channel: TextChannel = message.channel as TextChannel;

        const itemTypeInput: SearchableItemCategory | SearchableItemCategoryAlias =
            commandName.replace(/random\-?/, '') as
                | SearchableItemCategory
                | SearchableItemCategoryAlias;

        const itemType: SearchableItemCategory = unaliasItemType(itemTypeInput);

        const randomItemResult = await getRandomItem(itemType);

        if (randomItemResult) {
            await channel.send(randomItemResult);
        } else {
            await channel.send({
                embeds: [{ description: `No ${itemType} was found.` }],
            });
        }
    },
};

export default command;

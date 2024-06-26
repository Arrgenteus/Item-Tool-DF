import { Message, TextChannel } from 'discord.js';
import { ChatCommandData } from '../eventHandlerTypes.js';
import { getRandomItem } from '../interactionLogic/search/random.js';
import {
    SearchableItemCategory,
    SearchableItemCategoryAlias,
} from '../interactionLogic/search/types.js';
import { unaliasItemType } from '../interactionLogic/search/utils.js';
import { botResponseCache } from '../utils/store.js';

export const randomItemCommand: ChatCommandData = {
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

        let sentMessage: Message;
        if (randomItemResult) {
            sentMessage = await channel.send(randomItemResult);
        } else {
            sentMessage = await channel.send({
                embeds: [{ description: `No ${itemType} was found.` }],
            });
        }
        botResponseCache.set(message.id, sentMessage);
    },
};

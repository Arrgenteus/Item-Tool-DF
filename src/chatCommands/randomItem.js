import { getRandomItem } from '../interactionLogic/search/random';
import { unaliasItemType } from '../interactionLogic/search/utils';
import { botResponseCache } from '../utils/store';
export const randomItemCommand = {
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
    run: async (message, args, commandName) => {
        const channel = message.channel;
        const itemTypeInput = commandName.replace(/random\-?/, '');
        const itemType = unaliasItemType(itemTypeInput);
        const randomItemResult = await getRandomItem(itemType);
        let sentMessage;
        if (randomItemResult) {
            sentMessage = await channel.send(randomItemResult);
        }
        else {
            sentMessage = await channel.send({
                embeds: [{ description: `No ${itemType} was found.` }],
            });
        }
        botResponseCache.set(message.id, sentMessage);
    },
};

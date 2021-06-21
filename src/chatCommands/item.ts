import { Message } from 'discord.js';
import { ChatCommandData } from '../commonTypes/commandStructures';

const command: ChatCommandData = {
    names: [
        'item',
        'wep',
        'weapon',
        'acc',
        'accessory',
        'helm',
        'helmet',
        'cape',
        'wing',
        'wings',
        'belt',
        'necklace',
        'ring',
        'trinket',
        'bracer',
    ],
    async run(message: Message, args: string, commandName: string): Promise<void> {},
};

export default command;

import { ClientEvents } from 'discord.js';

export interface ClientEventHandler {
    readonly eventName: keyof ClientEvents;
    run(...args: any[]): Promise<void>;
}

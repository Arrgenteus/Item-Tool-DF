import { Message, Snowflake } from 'discord.js';
import { LRUCache } from 'lru-cache';

// LRU cache which maintains corresponding bot message responses to user messages which contain commands
export const botResponseCache: LRUCache<Snowflake, Message> = new LRUCache({
    max: 20,
    ttl: 1000 * 60 * 60, // Prune after an hour
});

import { LRUCache } from 'lru-cache';
import { SortFilterParams } from './types.js';
import { Snowflake } from 'discord.js';
import { ValidationError } from '../../errors.js';
import rfdc from 'rfdc';

const clone = rfdc();

const cache: LRUCache<Snowflake, SortFilterParams> = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 5,
});

export function cacheSortQueryFilters(messageId: Snowflake, sortFilters: SortFilterParams) {
    cache.set(messageId, sortFilters);
}

export function getSortQueryFiltersFromOriginalMessage(messageId: Snowflake): SortFilterParams {
    if (!cache.has(messageId)) {
        throw new ValidationError(
            'These sort results have expired. Please use the command once again.'
        );
    }

    return clone(cache.get(messageId)!);
}

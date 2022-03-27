import config from '../../config';
import { elasticClient } from '../../dbConnection';
import { ACCESSORY_TYPES } from '../../utils/itemTypeData';
import { SearchableItemCategory } from './types';
import { formatQueryResponse } from './utils';

export async function getRandomItem(itemCategory: SearchableItemCategory) {
    let categoryFilter: string | undefined;
    if (itemCategory && itemCategory in ACCESSORY_TYPES) categoryFilter = itemCategory;

    let indexName: string = config.ACCESSORY_INDEX_NAME;
    if (itemCategory === 'pet') indexName = config.PET_INDEX_NAME;

    const { body: responseBody } = await elasticClient.search({
        index: indexName,
        body: {
            size: 1,
            query: {
                function_score: {
                    query: categoryFilter
                        ? { bool: { filter: { term: { item_type: categoryFilter } } } }
                        : undefined,
                    random_score: {},
                },
            },
        },
    });

    return formatQueryResponse(responseBody, itemCategory);
}

import { elasticClient } from '../../dbConnection.js';
import { formatQueryResponse } from './formattedResults.js';
import { getSpecificCategoryFilterQuery } from './search.js';
import { SearchableItemCategory } from './types.js';
import { getIndexNames } from './utils.js';

export async function getRandomItem(itemCategory: SearchableItemCategory) {
    const itemIndexes: string[] = getIndexNames(itemCategory);

    const itemCategoryFilterQuery = getSpecificCategoryFilterQuery(itemCategory);

    const { body: responseBody } = await elasticClient.search({
        index: itemIndexes,
        body: {
            size: 1,
            query: {
                function_score: {
                    query: itemCategoryFilterQuery,
                    random_score: {},
                },
            },
        },
    });

    return formatQueryResponse(responseBody);
}

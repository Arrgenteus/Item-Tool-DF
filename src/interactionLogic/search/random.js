import { elasticClient } from '../../dbConnection';
import { formatQueryResponse } from './formattedResults';
import { getSpecificCategoryFilterQuery } from './search';
import { getIndexNames } from './utils';
export async function getRandomItem(itemCategory) {
    const itemIndexes = getIndexNames(itemCategory);
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

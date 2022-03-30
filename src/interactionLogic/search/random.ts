import config from '../../config';
import { elasticClient } from '../../dbConnection';
import { SearchableItemCategory } from './types';
import { formatQueryResponse, getIndexNameAndCategoryFilterQuery } from './utils';

export async function getRandomItem(itemCategory: SearchableItemCategory) {
    const { index: itemIndex, query: itemCategoryFilterQuery } =
        getIndexNameAndCategoryFilterQuery(itemCategory);

    const { body: responseBody } = await elasticClient.search({
        index: itemIndex,
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

    return formatQueryResponse(responseBody, itemCategory);
}

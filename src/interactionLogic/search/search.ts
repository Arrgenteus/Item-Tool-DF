import {
    BaseMessageComponentOptions,
    MessageButtonOptions,
    MessageEmbedOptions,
    MessageOptions,
    Snowflake,
} from 'discord.js';
import { elasticClient } from '../../dbConnection';
import {
    formatQueryResponse,
    getButtonForMoreItemImages,
    getButtonListForSimilarResults,
} from './formattedResults';
import { SearchableItemCategory } from './types';
import { getIndexNames, getVariantAndUnaliasTokens, romanIntToInt } from './utils';

export function getSpecificCategoryFilterQuery(
    itemSearchCategory: SearchableItemCategory
): { terms: { item_type: SearchableItemCategory[] } | { common_tags: ['cosmetic'] } } | undefined {
    if (itemSearchCategory === 'cosmetic') {
        return { terms: { common_tags: ['cosmetic'] } };
    }

    if (['weapon', 'accessory', 'item', 'pet'].includes(itemSearchCategory)) return undefined;

    let itemTypeFilterItems: SearchableItemCategory[];

    if (['cape', 'wings'].includes(itemSearchCategory)) {
        itemTypeFilterItems = ['cape', 'wings'];
    } else if (['sword', 'axe', 'mace'].includes(itemSearchCategory)) {
        itemTypeFilterItems = ['sword', 'axe', 'mace'];
    } else if (['staff', 'wand'].includes(itemSearchCategory)) {
        itemTypeFilterItems = ['staff', 'wand'];
    } else {
        itemTypeFilterItems = [itemSearchCategory];
    }

    return { terms: { item_type: itemTypeFilterItems } };
}

function getMaxAndMinLevelFilter({
    maxLevel,
    minLevel,
}: {
    maxLevel?: number;
    minLevel?: number;
}): { range: { level: { lte?: number; gte?: number } } } | undefined {
    let levelFilter: { range: { level: { lte?: number; gte?: number } } } | undefined;
    if (maxLevel !== undefined) {
        levelFilter = { range: { level: { lte: maxLevel } } };
    }
    if (minLevel !== undefined) {
        if (levelFilter) levelFilter.range.level.gte = minLevel;
        else levelFilter = { range: { level: { gte: minLevel } } };
    }
    return levelFilter;
}

function getMatchQueryBody(
    tokens: string[],
    itemSearchCategory: SearchableItemCategory,
    familyTitles: boolean = false
) {
    const isPet = itemSearchCategory === 'pet';

    const stopWords = new Set([
        'a',
        'an',
        'and',
        'are',
        'as',
        'at',
        'be',
        'but',
        'by',
        'for',
        'if',
        'in',
        'into',
        'is',
        'it',
        'no',
        'not',
        'of',
        'on',
        'or',
        'such',
        'that',
        'the',
        'their',
        'then',
        'there',
        'these',
        'they',
        'this',
        'to',
        'was',
        'will',
        'with',
    ]);
    const stopWordCount = tokens.filter((token) => stopWords.has(token)).length;

    const minimumShouldMatch: string = isPet
        ? `${2 + stopWordCount}<75%`
        : `${3 + stopWordCount}<75%`;

    const term = tokens.join(' ');
    const termWithoutStopwords = tokens.filter((token) => !stopWords.has(token)).join(' ');

    const fieldName = familyTitles ? 'family_titles' : 'title';

    return [
        {
            match_phrase: {
                // Greatly boost exact matches
                [`${fieldName}.exact`]: {
                    query: term,
                    analyzer: 'exact',
                    boost: 10,
                },
            },
        },
        {
            match: {
                [`${fieldName}.exact`]: {
                    query: term,
                    prefix_length: 1,
                    minimum_should_match: '100%',
                    analyzer: 'exact',
                    fuzziness: 'AUTO:8,9999',
                    boost: 6,
                },
            },
        },
        {
            match: {
                [`${fieldName}.exact`]: {
                    query: term,
                    prefix_length: 1,
                    minimum_should_match: '100%',
                    analyzer: 'exact',
                    fuzziness: 'AUTO:8,10',
                    boost: 4,
                },
            },
        },
        {
            match: {
                [`${fieldName}.forward_autocomplete`]: {
                    query: termWithoutStopwords,
                    minimum_should_match: minimumShouldMatch,
                    fuzziness: 'AUTO:5,8',
                    prefix_length: 1,
                    boost: 0.05,
                },
            },
        },
        {
            match: {
                [`${fieldName}.forward_autocomplete`]: {
                    query: termWithoutStopwords,
                    minimum_should_match: '100%',
                    fuzziness: 'AUTO:5,8',
                    prefix_length: 1,
                    boost: 0.5,
                },
            },
        },
        {
            match: {
                [`${fieldName}.forward_autocomplete`]: {
                    query: termWithoutStopwords,
                    minimum_should_match: '100%',
                    boost: 1,
                },
            },
        },
        {
            match: {
                [`${fieldName}.forward_autocomplete`]: {
                    query: termWithoutStopwords,
                    minimum_should_match: '100%',
                    analyzer: 'exact',
                    boost: 1,
                },
            },
        },
        ...(termWithoutStopwords.length > 3
            ? [
                  {
                      match: {
                          [`${fieldName}.autocomplete`]: {
                              query: termWithoutStopwords,
                              fuzziness: 'AUTO:6,9',
                              prefix_length: 2,
                              minimum_should_match: '100%',
                              boost: 0.01,
                          },
                      },
                  },
              ]
            : []),
        ...(tokens.length > 1
            ? [
                  {
                      bool: {
                          must: [
                              {
                                  term: {
                                      [`${fieldName}.word_count`]: tokens.length,
                                  },
                              },
                              {
                                  match: {
                                      [`${fieldName}.words`]: {
                                          query: term,
                                          prefix_length: 1,
                                          minimum_should_match: '100%',
                                          fuzziness: 'AUTO:5,9999',
                                          boost: 6,
                                      },
                                  },
                              },
                          ],
                      },
                  },
                  {
                      match: {
                          [`${fieldName}.words`]: {
                              query: term,
                              minimum_should_match: minimumShouldMatch,
                              fuzziness: 'AUTO:4,7',
                              prefix_length: 1,
                              boost: 0.01,
                          },
                      },
                  },
                  {
                      match: {
                          [`${fieldName}.words`]: {
                              query: term,
                              minimum_should_match: '100%',
                              fuzziness: 'AUTO:4,7',
                              prefix_length: 1,
                              boost: 0.5,
                          },
                      },
                  },
                  {
                      match: {
                          [`${fieldName}.shingles`]: {
                              query: term,
                              minimum_should_match: '100%',
                              fuzziness: 'AUTO:8,10',
                              prefix_length: 1,
                              analyzer: 'exact',
                              boost: 1,
                          },
                      },
                  },
              ]
            : []),
        {
            match: {
                [`${fieldName}.shingles`]: {
                    query: term,
                    minimum_should_match: minimumShouldMatch,
                    fuzziness: 'AUTO:7,9',
                    prefix_length: 1,
                    analyzer: 'input_shingle_analyzer',
                    boost: 0.05,
                },
            },
        },
        // match words that are joined together in the input, but are separate tokens in the document
        {
            match: {
                [`${fieldName}.shingles`]: {
                    query: term,
                    minimum_should_match: minimumShouldMatch,
                    fuzziness: 'AUTO:7,9',
                    prefix_length: 1,
                    boost: 0.01,
                },
            },
        },
    ];
}

async function fetchItemSearchResult({
    term,
    itemSearchCategory,
    maxLevel,
    minLevel,
}: {
    term: string;
    itemSearchCategory: SearchableItemCategory;
    maxLevel?: number;
    minLevel?: number;
}) {
    const query: { [key: string]: any } = {
        bool: {
            filter: getSpecificCategoryFilterQuery(itemSearchCategory),
            minimum_should_match: 1,
        },
    };

    const itemIndexes: string[] = getIndexNames(itemSearchCategory);

    const { unaliasedTokens, variantRomanNumber } = getVariantAndUnaliasTokens(
        term,
        itemSearchCategory
    );

    let variantFilter: any | undefined;
    if (variantRomanNumber) {
        variantFilter = {
            bool: {
                should: [
                    { match: { variant_number: romanIntToInt(variantRomanNumber) } },
                    { match: { 'title.words': variantRomanNumber } },
                ],
            },
        };
    }

    const levelFilter: { range: { level: { lte?: number; gte?: number } } } | undefined =
        getMaxAndMinLevelFilter({ maxLevel, minLevel });

    const isPet = itemSearchCategory === 'pet';

    // Match words that are joined together in the input, but are separate tokens in the document
    query.bool.should = getMatchQueryBody(unaliasedTokens, itemSearchCategory);

    const petScoringScript: string = `
        def critOrBonus = 0;
        for (bonus in params._source.bonuses.keySet()) {
            if (bonus == 'crit') {
                if (params._source.bonuses[bonus] instanceof int) critOrBonus += params._source.bonuses[bonus];
                else critOrBonus += 20;
            } else if (bonus == 'bonus') {
                if (params._source.bonuses[bonus] instanceof int) critOrBonus += params._source.bonuses[bonus];
                else critOrBonus += 20;
            }
        }
        def finalScore = _score + (critOrBonus + doc['level'].value) / 10;
        if (doc['scaled_damage'].value) {
            finalScore = _score + (critOrBonus / 10) + (params.containsKey('maxLevel') ? params['maxLevel'] / 10 : 9);
        }
        if (!params._source.common_tags.contains('rare')) {
            finalScore += 5;
        }
        return finalScore;`;

    const itemScoringScript: string = `
        def bonusTotal = 0;
        for (bonus in params._source.bonuses) {
            if (bonus.value > 0) {
                bonusTotal += bonus.value;
            }
        }

        def resistTotal = 0;
        def allResist = 0;
        for (resist in params._source.resists) {
            if (resist.value > 50) {
                continue;
            }
            if (resist.name == 'health') {
                if (resist.value < 0) {
                    resistTotal += -resist.value;
                }
            } else if (resist.value > 0) {
                if (resist.name == 'all') {
                    allResist = resist.value;
                } else {
                    resistTotal += resist.value;
                }
            }
        }

        def modifiedScore = _score;

        modifiedScore = modifiedScore + bonusTotal / 10 + resistTotal / 15 + allResist;
        if (params._source.common_tags.contains('dc')) {
            modifiedScore = modifiedScore - 0.0001;
        }

        if (!params._source.common_tags.contains('rare')) {
            modifiedScore += 5;
        }

        return modifiedScore;`;

    const searchQuery = {
        index: itemIndexes,
        body: {
            track_scores: true,
            size: 1, // Set size to 1 to return only the top result
            sort: ['_score', { level: 'desc' }, { title_keyword: 'asc' }],
            query: {
                // Filter documents and modify search score based on item level/stats
                function_score: {
                    query: {
                        function_score: {
                            query: query,
                            script_score: {
                                script: {
                                    params: {
                                        maxLevel: maxLevel,
                                    },
                                    source: isPet ? petScoringScript : itemScoringScript,
                                },
                            },
                            boost_mode: 'replace',
                        },
                    },
                    // Place on top results that match provided level/variant filters
                    // Prevents mismatches with other_level_variants aggregation after
                    // post filters are applied
                    functions: [
                        ...(levelFilter
                            ? [
                                  {
                                      filter: levelFilter,
                                      weight: 1000,
                                  },
                              ]
                            : []),
                        ...(variantFilter
                            ? [
                                  {
                                      filter: variantFilter,
                                      weight: 1000,
                                  },
                              ]
                            : []),
                        // If the user is searching for wings, prioritize wings over capes and vice versa
                        ...(itemSearchCategory === 'wings'
                            ? [
                                  {
                                      filter: { term: { item_type: 'wings' } },
                                      weight: 1000,
                                  },
                              ]
                            : []),
                        { filter: { exists: { field: 'trinket_skill' } }, weight: 30 },
                    ],
                    boost_mode: 'sum',
                    score_mode: 'sum',
                },
            },
            // Add level or variant filters as post filters so they do not appear
            // in search results, but are still usable by aggregations
            post_filter:
                levelFilter || variantFilter
                    ? {
                          bool: {
                              filter: [levelFilter, variantFilter].filter(
                                  (filterType) => !!filterType
                              ),
                          },
                      }
                    : undefined,
            aggs: {
                other_level_variants: {
                    terms: {
                        field: 'family',
                        order: {
                            // Sort buckets by those with the max score
                            max_score: 'desc',
                        },
                        size: 1, // Get top result only
                    },
                    aggs: {
                        items: {
                            top_hits: {
                                _source: { includes: ['level', 'full_title', 'title'] },
                                sort: [{ level: { order: 'asc' } }, { _score: { order: 'asc' } }],
                                size: 40,
                            },
                        },
                        max_score: {
                            // Calculate max score for each bucket for sorting purposes
                            max: {
                                script: '_score',
                            },
                        },
                    },
                },
                similar_results: {
                    // Place documents with the same family into buckets
                    filter: levelFilter || { match_all: {} },
                    aggs: {
                        filtered: {
                            terms: {
                                field: 'family',
                                order: {
                                    // Sort buckets by those with the max score
                                    max_score: 'desc',
                                },
                                size: 4, // Get top 4 results
                            },
                            aggs: {
                                items: {
                                    // Within each bucket, get only details of pet with max score
                                    top_hits: {
                                        _source: { includes: ['full_title', 'item_type'] },
                                        sort: { _score: 'desc' },
                                        size: 1,
                                    },
                                },
                                max_score: {
                                    // Calculate max score for each bucket for sorting purposes
                                    max: {
                                        script: '_score',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    };

    let { body: responseBody } = await elasticClient.search(searchQuery);

    // If the result was empty, check if the search query matches the family names
    // of other items
    if (!responseBody.hits?.hits?.length) {
        query.bool.should = getMatchQueryBody(unaliasedTokens, itemSearchCategory, true);
        responseBody = (await elasticClient.search(searchQuery)).body;
    }

    return responseBody;
}

export async function getSearchResultMessagewithButtons({
    term,
    itemSearchCategory,
    userIdForSimilarResults,
    maxLevel,
    minLevel,
}: {
    term: string;
    itemSearchCategory: SearchableItemCategory;
    userIdForSimilarResults: Snowflake;
    maxLevel?: number;
    minLevel?: number;
}): Promise<Pick<MessageOptions, 'components' | 'embeds'> | undefined> {
    const searchResultResponseBody = await fetchItemSearchResult({
        term,
        itemSearchCategory,
        maxLevel,
        minLevel,
    });

    const formattedQueryResponse = formatQueryResponse(searchResultResponseBody);
    if (!formattedQueryResponse) return;

    const messageButtons: (Required<BaseMessageComponentOptions> & MessageButtonOptions)[] = [];

    const searchResultImageCount: number =
        searchResultResponseBody.hits.hits[0]._source.images?.length ?? 0;
    if (searchResultImageCount > 1) {
        const searchResultTitle: string = searchResultResponseBody.hits.hits[0]._source.full_title;
        const moreImagesButton = getButtonForMoreItemImages({
            itemName: searchResultTitle,
            itemSearchCategory,
            maxLevel,
            minLevel,
        });

        messageButtons.push(moreImagesButton);
    }

    const similarResultButtons = getButtonListForSimilarResults({
        responseBody: searchResultResponseBody,
        userId: userIdForSimilarResults,
        itemSearchCategory,
        maxLevel,
        minLevel,
    });
    messageButtons.push(...similarResultButtons);

    if (messageButtons.length) {
        formattedQueryResponse.components = [{ type: 'ACTION_ROW', components: messageButtons }];
    }

    return formattedQueryResponse;
}

export async function getSearchResultMessage({
    term,
    itemSearchCategory,
    maxLevel,
    minLevel,
}: {
    term: string;
    itemSearchCategory: SearchableItemCategory;
    maxLevel?: number;
    minLevel?: number;
}): Promise<
    | {
          message: Pick<MessageOptions, 'components' | 'embeds'>;
          hasMultipleImages: boolean;
      }
    | undefined
> {
    const searchResultResponseBody = await fetchItemSearchResult({
        term,
        itemSearchCategory,
        maxLevel,
        minLevel,
    });

    const formattedQueryResponse = formatQueryResponse(searchResultResponseBody);
    if (!formattedQueryResponse) return;

    const searchResultImageCount: number =
        searchResultResponseBody.hits.hits[0]._source.images?.length ?? 0;

    return { message: formattedQueryResponse, hasMultipleImages: searchResultImageCount > 1 };
}

export async function getAllItemImages({
    itemName,
    itemSearchCategory,
    maxLevel,
    minLevel,
}: {
    itemName: string;
    itemSearchCategory: SearchableItemCategory;
    maxLevel?: number;
    minLevel?: number;
}): Promise<MessageEmbedOptions[]> {
    const itemIndexes: string[] = getIndexNames(itemSearchCategory);

    const filterQuery = {
        bool: {
            filter: [
                { terms: { 'full_title.keyword': [itemName] } },
                getSpecificCategoryFilterQuery(itemSearchCategory),
                getMaxAndMinLevelFilter({ maxLevel, minLevel }),
            ].filter((filterOption) => !!filterOption),
        },
    };

    const searchQuery = {
        index: itemIndexes,
        body: {
            size: 1,
            sort: { level: 'desc' },
            query: filterQuery,
            fields: ['images'],
        },
    };

    let { body: responseBody } = await elasticClient.search(searchQuery);

    const itemImages = (responseBody.hits?.hits ?? [])[0]?._source?.images;

    if (!itemImages?.length) {
        return [{ description: 'No additional images were found.' }];
    }

    return itemImages.slice(0, 10).map((imageLink: string) => ({ image: { url: imageLink } }));
}

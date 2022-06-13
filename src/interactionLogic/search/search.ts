import { MessageActionRowOptions, MessageEmbedOptions, Snowflake } from 'discord.js';
import { elasticClient } from '../../dbConnection';
import { ACCESSORY_TYPES, WEAPON_TYPES } from '../../utils/itemTypeData';
import { ACCESSORY_ALIASES } from './aliases';
import { formatQueryResponse, getButtonListOfSimilarResults } from './formattedResults';
import { SearchableItemCategory } from './types';
import { getIndexNames, getVariantAndUnaliasTokens, romanIntToInt } from './utils';

export function getSpecificCategoryFilterQuery(
    itemSearchCategory: SearchableItemCategory
): { terms: { item_type: SearchableItemCategory[] } } | undefined {
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
    const term = tokens.join(' ');

    const minimumShouldMatch: string = isPet ? '2<75%' : '3<75%';

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
                    query: term,
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
                    query: term,
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
                    query: term,
                    minimum_should_match: '100%',
                    boost: 1,
                },
            },
        },
        {
            match: {
                [`${fieldName}.forward_autocomplete`]: {
                    query: term,
                    minimum_should_match: '100%',
                    analyzer: 'exact',
                    boost: 1,
                },
            },
        },
        ...(term.length > 3
            ? [
                  {
                      match: {
                          [`${fieldName}.autocomplete`]: {
                              query: term,
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

export async function getItemSearchResult({
    term,
    itemSearchCategory,
    maxLevel,
    minLevel,
    userIdForSimilarResults,
}: {
    term: string;
    itemSearchCategory: SearchableItemCategory;
    maxLevel?: number;
    minLevel?: number;
    userIdForSimilarResults?: Snowflake;
}): Promise<{ embeds: MessageEmbedOptions[]; components: MessageActionRowOptions[] } | undefined> {
    const query: { [key: string]: any } = {
        bool: {
            filter: getSpecificCategoryFilterQuery(itemSearchCategory),
            minimum_should_match: 1,
        },
    };

    const itemIndexes: string[] = getIndexNames(itemSearchCategory);

    const { unaliasedTokens, variantNumber } = getVariantAndUnaliasTokens(term, itemSearchCategory);

    let variantFilter: { match: { variant_number: number } } | undefined;
    if (variantNumber) {
        variantFilter = { match: { variant_number: variantNumber } };
    }

    const levelFilter: { range: { level: { lte?: number; gte?: number } } } | undefined =
        getMaxAndMinLevelFilter({ maxLevel, minLevel });

    const isPet = itemSearchCategory === 'pet';

    // Match words that are joined together in the input, but are separate tokens in the document
    query.bool.should = getMatchQueryBody(unaliasedTokens, itemSearchCategory);

    const petScoringScript: string = `
        def critOrBonus = 0;
        for (bonus in params._source.bonuses) {
            if (bonus.name == 'crit') {
                if (bonus.value instanceof int) critOrBonus += bonus.value;
                else critOrBonus += 20;
            } else if (bonus.name == 'bonus') {
                if (bonus.value instanceof int) critOrBonus += bonus.value;
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
            sort: ['_score', { level: 'desc' }, { 'title.keyword': 'asc' }],
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

    const formattedQueryResponse = formatQueryResponse(responseBody);
    if (formattedQueryResponse && userIdForSimilarResults) {
        formattedQueryResponse.components = getButtonListOfSimilarResults({
            responseBody,
            userId: userIdForSimilarResults,
            itemSearchCategory,
            maxLevel,
            minLevel,
        });
    }

    return formattedQueryResponse;
}

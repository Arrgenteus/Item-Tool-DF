import { MessageEmbedOptions } from 'discord.js';
import { elasticClient } from '../../dbConnection';
import { SearchableItemCategory } from './types';
import { formatQueryResponse, getIndexNameAndCategoryFilterQuery, romanIntToInt } from './utils';

const PET_ALIASES: { [word: string]: string } = {
    tfs: 'rare pet tog',
    ex: 'extreme',
};

const ACCESSORY_ALIASES: { [word: string]: string } = {
    k: 'thousand',
    '1k': 'thousand',
    adl: 'ancient dragonlord helm',
    ba: "baltael's aventail",
    bsw: "baltael's aventail",
    c7: 'the corrupted seven',
    ddb: 'defenders dragon belt',
    ddn: 'defenders dragon necklace',
    ddr: 'defenders dragon ring',
    ddv: 'distorted doom visage',
    drk: 'dragonknight',
    eud: 'elemental unity defender',
    fdl: 'fierce dragonlord',
    dlc: 'dragonlord captain',
    gt: 'grove tender',
    nstb: 'not so tiny bubbles',
    pdl: "dragon's patience",
    rdl: "dragon's rage",
    bdl: "dragon's bulwark",
    wdl: "dragon's wrath",
    sf: 'soulforged',
};

function getVariantAndUnaliasTerm(
    searchTerm: string,
    itemSearchCategory: SearchableItemCategory
): { unaliasedTerm: string; variantNumber?: number } {
    const words: string[] = searchTerm.split(/[ _\\-]+/);

    const romanNumberRegex: RegExp = /^((?:x{0,3})(ix|iv|v?i{0,3}))$/i;
    let variantNumber: number | undefined;
    for (const index of [words.length - 1, words.length - 2].filter((i: number) => i > 0)) {
        if (words[index].match(romanNumberRegex)) {
            variantNumber = romanIntToInt(words[index]);
            words.splice(index, 1);
            break;
        }
    }

    let aliasDict = ACCESSORY_ALIASES;
    if (itemSearchCategory === 'pet') aliasDict = PET_ALIASES;

    const unaliasedTerm: string = words.map((word: string) => aliasDict[word] || word).join(' ');

    return { unaliasedTerm, variantNumber };
}

export async function getItemSearchResult(
    term: string,
    itemSearchCategory: SearchableItemCategory,
    maxLevel?: number,
    minLevel?: number
): Promise<{ message: MessageEmbedOptions; noResults: boolean }> {
    const query: { [key: string]: any } = { bool: { minimum_should_match: 1 } };

    // Narrow search based on specific item type
    const { index: itemIndex, query: itemCategoryFilterQuery } =
        getIndexNameAndCategoryFilterQuery(itemSearchCategory);

    if (itemCategoryFilterQuery) {
        query.bool.filter = itemCategoryFilterQuery;
    }

    const { unaliasedTerm, variantNumber } = getVariantAndUnaliasTerm(term, itemSearchCategory);

    let variantFilter: { match: { variant_number: number } } | undefined;
    if (variantNumber) {
        variantFilter = { match: { variant_number: variantNumber } };
    }

    let levelFilter: { range: { level: { lte?: number; gte?: number } } } | undefined;
    if (maxLevel !== undefined) {
        levelFilter = { range: { level: { lte: maxLevel } } };
    }
    if (minLevel !== undefined) {
        if (levelFilter) levelFilter.range.level.gte = minLevel;
        else levelFilter = { range: { level: { gte: minLevel } } };
    }

    const isPet = itemSearchCategory === 'pet';

    const minimumShouldMatch: string = isPet ? '2<75%' : '3<75%';
    const defaultFuzziness: string = isPet ? 'AUTO:4,7' : 'AUTO:4,6';

    query.bool.should = [
        {
            match_phrase: {
                // Greatly boost exact matches
                'title.exact': {
                    query: unaliasedTerm,
                    boost: 10,
                },
            },
        },
        // {
        //     match: {
        //         'title.forward_autocomplete': {
        //             query: unaliasedTerm,
        //             minimum_should_match: minimumShouldMatch,
        //             fuzziness: defaultFuzziness,
        //             prefix_length: 1,
        //             boost: 0.25,
        //         },
        //     },
        // },
        {
            match: {
                'title.autocomplete': {
                    query: unaliasedTerm,
                    minimum_should_match: minimumShouldMatch,
                    fuzziness: isPet ? 'AUTO:5,8' : 'AUTO:4,7',
                    prefix_length: 1,
                },
            },
        },
        {
            match: {
                'title.words': {
                    query: unaliasedTerm,
                    minimum_should_match: isPet ? '3<75%' : '4<80%',
                    fuzziness: defaultFuzziness,
                    prefix_length: 1,
                    boost: 2,
                },
            },
        },
        {
            match: {
                'title.shingles': {
                    query: unaliasedTerm,
                    minimum_should_match: minimumShouldMatch,
                    fuzziness: defaultFuzziness,
                    prefix_length: 1,
                    analyzer: 'input_shingle_analyzer',
                    boost: 1.5,
                },
            },
        },
        {
            match: {
                'title.shingles': {
                    query: unaliasedTerm,
                    minimum_should_match: isPet ? '3<75%' : '4<80%',
                    fuzziness: defaultFuzziness,
                    prefix_length: 1,
                    boost: 0.5,
                },
            },
        },

        // Search for family titles, ie other variant names of items within the same family
        // De-prioritize these results; They should not take predecence over normal matches
        {
            match: {
                'family_titles.forward_autocomplete': {
                    query: unaliasedTerm,
                    minimum_should_match: minimumShouldMatch,
                    fuzziness: defaultFuzziness,
                    prefix_length: 1,
                    boost: 0.05,
                },
            },
        },
        {
            match: {
                'family_titles.autocomplete': {
                    query: unaliasedTerm,
                    minimum_should_match: minimumShouldMatch,
                    fuzziness: isPet ? 'AUTO:5,8' : 'AUTO:4,7',
                    prefix_length: 1,
                    boost: 0.05,
                },
            },
        },
        {
            match: {
                'family_titles.words': {
                    query: unaliasedTerm,
                    minimum_should_match: minimumShouldMatch,
                    fuzziness: defaultFuzziness,
                    prefix_length: 1,
                    boost: 0.05,
                },
            },
        },
        {
            match: {
                'family_titles.shingles': {
                    query: unaliasedTerm,
                    minimum_should_match: minimumShouldMatch,
                    fuzziness: defaultFuzziness,
                    prefix_length: 1,
                    analyzer: 'input_shingle_analyzer',
                    boost: 0.05,
                },
            },
        },
        {
            match: {
                'family_titles.shingles': {
                    query: unaliasedTerm,
                    minimum_should_match: isPet ? '3<75%' : '4<80%',
                    fuzziness: defaultFuzziness,
                    prefix_length: 1,
                    boost: 0.05,
                },
            },
        },
    ];

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
            finalScore = _score + (critOrBonus / 10) + ${maxLevel ? maxLevel / 10 : 9};
        }
        if (params._source.common_tags.contains('rare')) {
            return 0.8 * finalScore;
        }
        return finalScore;`;

    const itemScoringScript: string = `
        def bonusTotal = 0;
        for (bonus in params._source.bonuses) {
            if (bonus.value > 0) {
                bonusTotal += bonus.value;
            }
        }

        def resistAverage = 0;
        def allResist = 0;
        def resistCount = params._source.resists.length;
        for (resist in params._source.resists) {
            if (resist.name == 'health') {
                if (resist.value < 0) {
                    resistAverage += -resist.value / params._source.resists.length;
                }
            } else if (resist.value > 0) {
                if (resist.name == 'all') {
                    allResist = resist.value;
                    resistCount -= 1;
                } else {
                    resistAverage += resist.value;
                }
            }
        }
        if (resistCount > 0) {
            resistAverage /= resistCount;
        }
        resistAverage += allResist;

        def finalScore = _score + bonusTotal / 10 + resistAverage;
        if (params._source.common_tags.contains('rare')) {
            finalScore = 0.8 * finalScore;
        }
        if (params._source.common_tags.contains('temp')) {
            finalScore = 0.7 * finalScore;
        }
        if (params._source.common_tags.contains('dc')) {
            finalScore = finalScore - 0.0001;
        }
        return finalScore;`;

    const { body: responseBody } = await elasticClient.search({
        index: itemIndex,
        body: {
            track_scores: true,
            size: 3, // Set size to 1 to return only the top result
            query: {
                // Filter documents and modify search score based on item level/stats
                function_score: {
                    query: {
                        function_score: {
                            query: query,
                            script_score: {
                                script: {
                                    // source: isPet ? petScoringScript : itemScoringScript,
                                    source: 'return _score',
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
                        { filter: { term: { item_type: 'trinket' } }, weight: 20 },
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
                                    top_metrics: {
                                        metrics: [{ field: 'title.keyword' }, { field: 'link' }],
                                        sort: { _score: 'desc' },
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
    });

    console.log(responseBody.hits.hits);

    return formatQueryResponse(responseBody, itemSearchCategory);
}

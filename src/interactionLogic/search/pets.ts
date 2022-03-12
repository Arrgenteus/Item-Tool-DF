import { MessageEmbedOptions, Util } from 'discord.js';
import config from '../../config';
import { elasticClient } from '../../dbConnection';
import { ItemTag, PRETTY_TAG_NAMES } from '../../utils/itemTypeData';
import { capitalize } from '../../utils/misc';

const WORD_ALIASES: { [word: string]: string } = {
    tfs: 'rare pet tog',
    ex: 'extreme',
};

function romanIntToInt(romanInt: string) {
    const romanPlaceValues: { [key: string]: number } = { i: 1, v: 5, x: 10 };

    let integer: number = romanPlaceValues[romanInt[0]];
    for (let i = 1; i < romanInt.length; ++i) {
        const currentLetterValue = romanPlaceValues[romanInt[i]];
        const prevLetterValue = romanPlaceValues[romanInt[i - 1]];
        if (currentLetterValue <= prevLetterValue) {
            integer += currentLetterValue;
        } else {
            integer = integer - prevLetterValue * 2 + currentLetterValue;
        }
    }

    return integer;
}

function getFormattedOtherLevelVariants(
    responseBody: any,
    searchResult: { [key: string]: any; full_title: string }
): string {
    // Get the source document of every other level variant and filter out the main result
    const otherLevelVariantList: { level: number; full_title: string }[] = (
        responseBody.aggregations?.other_level_variants?.buckets[0]?.pets?.hits?.hits || []
    )
        .map(
            (searchHit: { [key: string]: any; _source: { level: number; full_title: string } }) =>
                searchHit._source
        )
        .filter(
            ({ full_title }: { level: number; full_title: string }) =>
                full_title !== searchResult.full_title
        );
    // Get all levels that are repeated more than once
    const repeatedVariantLevels: Set<number> = new Set();
    for (let index = 1; index < otherLevelVariantList.length; ++index) {
        const level: number = otherLevelVariantList[index].level;
        // Levels should be in sorted order already
        if (level === otherLevelVariantList[index - 1].level) {
            repeatedVariantLevels.add(level);
        }
    }

    return otherLevelVariantList
        .map(({ level, full_title }: { level: number; full_title: string }) =>
            // To differentiate variants, display the item name next to the level if
            // there are multiple variants at the same level, or if the variant is
            // at the same level as the main result
            level === searchResult.level || repeatedVariantLevels.has(level)
                ? `${level} _(${full_title})_`
                : level.toString()
        )
        .join(', ');
}

function formatQueryResponse(responseBody: any): {
    message: MessageEmbedOptions;
    noResults: boolean;
} {
    const searchResult: any | undefined = responseBody.hits.hits[0]?._source;
    if (!searchResult) {
        return {
            message: { description: 'No pet was found.' },
            noResults: true,
        };
    }

    const tags: string =
        [searchResult.tags_1, searchResult.tags_2, searchResult.tags_3]
            .filter((tagList?: ItemTag[]) => !!tagList)
            .map(
                (tagList: ItemTag[]) =>
                    '`' +
                    (tagList.map((tag: ItemTag): string => PRETTY_TAG_NAMES[tag]).join(', ') ||
                        'Untagged') +
                    '`'
            )
            .join(' or ') || '`None`';
    const bonuses: string =
        (searchResult.bonuses || [])
            .map((stat: { name: string; value: string | number }) => {
                if (typeof stat.value === 'string')
                    return `${capitalize(stat.name)} +[${stat.value}]`;
                if (stat.value < 0) return `${capitalize(stat.name)} ${stat.value}`;
                return `${capitalize(stat.name)} +${stat.value}`;
            })
            .join(', ') || 'None';
    const attacks: string =
        searchResult.attacks
            .map(
                (attack: { appearance: string | string[]; description: string }, index: number) =>
                    (index + 1).toString() + '. ' + attack.description
            )
            .join('\n') || 'This pet has no attacks.';

    const similarResultList = responseBody.aggregations?.similar_results?.filtered?.buckets || [];
    const similarResults: string = similarResultList
        .slice(1)
        .map(
            (bucket: { pets: { top: [{ metrics: { 'title.keyword': string; link: string } }] } }) =>
                bucket.pets.top[0].metrics
        )
        .map(
            (similarResult: { 'title.keyword': string; link: string }) =>
                `[${similarResult['title.keyword']}](${similarResult.link})`
        )
        .join(', ');

    const otherLevelVariants: string = getFormattedOtherLevelVariants(responseBody, searchResult);

    let embedBody: string =
        `**Tags:** ${tags}\n` +
        `**Level:** ${searchResult.level}\n` +
        `**Damage:** ${Util.escapeMarkdown(searchResult.damage) || '0-0'}\n` +
        `**Element:** ${searchResult.elements.map(capitalize).join(' / ') || 'N/A'}\n` +
        `**Bonuses:** ${bonuses}`;

    if (otherLevelVariants) {
        embedBody += `\n**Other Level Variants:** ${otherLevelVariants}`;
    }

    const messageEmbed: MessageEmbedOptions = {
        url: searchResult.link,
        title: searchResult.full_title,
        description: embedBody,
        image: { url: searchResult.images[0] },
        fields: [{ name: 'Attacks', value: attacks }],
    };
    if (similarResults) {
        messageEmbed.fields!.push({ name: 'Similar Results', value: similarResults });
    }

    return { message: messageEmbed, noResults: false };
}

export async function getPetSearchResult(
    term: string,
    maxLevel?: number,
    minLevel?: number
): Promise<{ message: MessageEmbedOptions; noResults: boolean }> {
    const query: { [key: string]: any } = { bool: { minimum_should_match: 1 } };
    const romanNumberRegex: RegExp = /^((?:x{0,3})(ix|iv|v?i{0,3}))$/i;
    const words: string[] = term.split(/[ _\\-]+/);

    let variantFilter: { match: { variant: number } } | undefined;

    for (const index of [words.length - 1, words.length - 2].filter((i: number) => i > 0)) {
        if (words[index].match(romanNumberRegex)) {
            variantFilter = { match: { variant: romanIntToInt(words[index]) } };
            words.splice(index, 1);
            break;
        }
    }

    let levelFilter: { range: { level: { lte?: number; gte?: number } } } | undefined;
    if (maxLevel !== undefined) {
        levelFilter = { range: { level: { lte: maxLevel } } };
    }
    if (minLevel !== undefined) {
        if (levelFilter) levelFilter.range.level.gte = minLevel;
        else levelFilter = { range: { level: { gte: minLevel } } };
    }

    term = words.map((word) => WORD_ALIASES[word] || word).join(' ');

    query.bool.should = [
        {
            match_phrase: {
                // Greatly boost exact matches
                'title.exact': {
                    query: term,
                    boost: 10,
                },
            },
        },
        {
            match: {
                'title.forward_autocomplete': {
                    query: term,
                    minimum_should_match: '2<75%',
                    fuzziness: 'AUTO:4,7',
                    prefix_length: 1,
                },
            },
        },
        {
            match: {
                'title.autocomplete': {
                    query: term,
                    minimum_should_match: '2<75%',
                    fuzziness: 'AUTO:5,8',
                    prefix_length: 1,
                },
            },
        },
        {
            match: {
                'title.shingles': {
                    query: term,
                    minimum_should_match: '2<75%',
                    fuzziness: 'AUTO:4,7',
                    prefix_length: 1,
                    analyzer: 'input_shingle_analyzer',
                },
            },
        },
        {
            match: {
                'title.shingles': {
                    query: term,
                    minimum_should_match: '2<75%',
                    fuzziness: 'AUTO:4,7',
                    prefix_length: 1,
                },
            },
        },

        // Search for family titles, ie other variant names of items within the same family
        // De-prioritize these results; They should not take predecence over normal matches
        {
            match: {
                'family_titles.forward_autocomplete': {
                    query: term,
                    minimum_should_match: '2<75%',
                    fuzziness: 'AUTO:4,7',
                    prefix_length: 1,
                    boost: 0.1,
                },
            },
        },
        {
            match: {
                'family_titles.autocomplete': {
                    query: term,
                    minimum_should_match: '2<75%',
                    fuzziness: 'AUTO:5,8',
                    prefix_length: 1,
                    boost: 0.1,
                },
            },
        },
        {
            match: {
                'family_titles.shingles': {
                    query: term,
                    minimum_should_match: '2<75%',
                    fuzziness: 'AUTO:4,7',
                    prefix_length: 1,
                    analyzer: 'input_shingle_analyzer',
                    boost: 0.1,
                },
            },
        },
        {
            match: {
                'family_titles.shingles': {
                    query: term,
                    minimum_should_match: '2<75%',
                    fuzziness: 'AUTO:4,7',
                    prefix_length: 1,
                    boost: 0.1,
                },
            },
        },
    ];

    const { body: responseBody } = await elasticClient.search({
        index: config.PET_INDEX_NAME,
        body: {
            track_scores: true,
            size: 1, // Set size to 1 to return only the top result
            query: {
                // Filter documents and modify search score based on item level/stats
                function_score: {
                    query: {
                        function_score: {
                            query: query,
                            script_score: {
                                script: {
                                    source: `
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
                                            finalScore = _score + (critOrBonus / 10) + ${
                                                maxLevel ? maxLevel / 10 : 9
                                            };
                                        }
                                        if (params._source.tags_1.contains('rare')) {
                                            if (params._source.tags_2 !== null && !params._source.tags_2.contains('rare')) {
                                                return finalScore;
                                            }
                                            return 0.8 * finalScore;
                                        }
                                        return finalScore;`,
                                },
                            },
                            boost_mode: 'replace',
                        },
                    },
                    // Place results on top that match provided level/variant filters
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
                        pets: {
                            top_hits: {
                                _source: { includes: ['level', 'full_title'] },
                                sort: [{ level: { order: 'asc' } }, { _score: { order: 'asc' } }],
                                size: 30,
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
                                pets: {
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

    return formatQueryResponse(responseBody);
}

export async function getRandomPet() {
    const { body: responseBody } = await elasticClient.search({
        index: config.PET_INDEX_NAME,
        body: {
            size: 1,
            query: {
                function_score: {
                    random_score: {},
                },
            },
        },
    });

    return formatQueryResponse(responseBody);
}

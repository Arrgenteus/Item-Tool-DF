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

function formatResult(searchHits: any[]): MessageEmbedOptions {
    if (!searchHits.length) return { description: 'No pet was found.' };

    const mainResult = searchHits[0]._source;
    const tags: string =
        [mainResult.tags_1, mainResult.tags_2, mainResult.tags_3]
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
        (mainResult.bonuses || [])
            .map((stat: { name: string; value: string | number }) => {
                if (typeof stat.value === 'string')
                    return `${capitalize(stat.name)} +[${stat.value}]`;
                if (stat.value < 0) return `${capitalize(stat.name)} ${stat.value}`;
                return `${capitalize(stat.name)} +${stat.value}`;
            })
            .join(', ') || 'None';
    const attacks: string =
        mainResult.attacks
            .map(
                (attack: { appearance: string | string[]; description: string }, index: number) =>
                    (index + 1).toString() + '. ' + attack.description
            )
            .join('\n') || 'This pet has no attacks.';

    const otherResults = searchHits
        .slice(1)
        .map((searchHit) => `[${searchHit._source.title}](${searchHit._source.link})`)
        .join(', ');

    let embedBody: string =
        `**Tags:** ${tags}\n` +
        `**Level:** ${mainResult.level}\n` +
        `**Damage:** ${Util.escapeMarkdown(mainResult.damage) || '0-0'}\n` +
        `**Element:** ${mainResult.elements.map(capitalize).join(' / ') || 'N/A'}\n` +
        `**Bonuses:** ${bonuses}`;

    if (mainResult.other_level_variants) {
        embedBody += `\n**Other Level Variants: ${mainResult.other_level_variants.join(', ')}`;
    }

    return {
        url: mainResult.link,
        title: mainResult.full_title,
        description: embedBody,
        image: { url: mainResult.images[0] },
        fields: [
            { name: 'Attacks', value: attacks },
            { name: 'Similar Results', value: otherResults },
        ],
    };
}

export async function getPetSearchResult(
    term: string,
    maxLevel?: number
): Promise<{ message: MessageEmbedOptions; noResults: boolean }> {
    const query: { [key: string]: any } = { bool: { minimum_should_match: 1 } };
    const romanNumberRegex: RegExp = /^((?:x{0,3})(ix|iv|v?i{0,3}))$/i;
    const words: string[] = term.split(/[ _\\-]+/);

    const additionalFilters: { [key: string]: any }[] = [];

    for (const index of [words.length - 1, words.length - 2].filter((i: number) => i > 0)) {
        if (words[index].match(romanNumberRegex)) {
            additionalFilters.push({ match: { variant: romanIntToInt(words[index]) } });
            words.splice(index, 1);
            break;
        }
    }
    term = words.map((word) => WORD_ALIASES[word] || word).join(' ');

    query.bool.should = [
        {
            match_phrase: {
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
    ];
    maxLevel = 20;
    if (maxLevel !== undefined) {
        additionalFilters.push({ range: { level: { lte: maxLevel } } });
    }

    // if (additionalFilters.length) {
    //     query.bool.filter = additionalFilters;
    // }

    const { body: responseBody } = await elasticClient.search({
        index: config.PET_INDEX_NAME,
        body: {
            track_scores: true,
            size: 0, // Set size to 0 to only return aggregation results and not query results
            query: {
                // Filter documents and modify search score based on item level/stats
                function_score: {
                    query,
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
            aggs: {
                results: {
                    // Place documents with the same family into buckets
                    terms: {
                        field: 'family',
                        order: {
                            // Sort buckets by those with the max score
                            max_score: 'desc',
                        },
                        size: 4, // Limit result to top 4 buckets
                    },
                    aggs: {
                        pets: {
                            // Within each bucket, get details of pet with max score
                            filter: additionalFilters[0],
                            aggs: {
                                filtered_pets: {
                                    top_hits: {
                                        sort: [
                                            {
                                                _score: {
                                                    order: 'desc',
                                                },
                                            },
                                        ],
                                        size: 1, // There shouldn't be more than 30 variants of the same item
                                    },
                                },
                            },
                        },
                        // filtered_pets_exist: {
                        //     bucket_script: {
                        //         buckets_path: {
                        //             filtered_pets: 'pets>filtered_pets',
                        //         },
                        //         script: 'params.filtered_pets',
                        //     },
                        // },
                        max_score: {
                            max: {
                                script: '_score',
                            },
                        },
                    },
                },
            },
        },
    });

    // const results = responseBody.aggregatios.results.buckets
    //     .map((bucket: any) => bucket.pet.hits.hits)
    //     .filter((hits: any) => !!hits.length);

    // if (!result.length) {
    //     return {
    //         message: formatResult([]),
    //         noResults: !results.length,
    //     };
    // }

    const results = responseBody.aggregations.results.buckets
        .map((bucket: any) => bucket.pet.hits.hits)
        .filter((petResults: any[]) => !!petResults.length)
        .map((petResults: any[]) => {
            petResults[0].other_level_variants = petResults
                .slice(1)
                .sort(
                    (
                        pet1: { level: number; [key: string]: any },
                        pet2: { level: number; [key: string]: any }
                    ) => pet2.level - pet1.level
                );
            return petResults[0];
        })
        .filter((result: any) => !!result);

    return {
        message: formatResult(results),
        noResults: !results.length,
    };
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

    return {
        message: formatResult(responseBody.hits.hits),
        noResults: !responseBody.hits.hits.length,
    };
}

import { MessageEmbedOptions, Util } from 'discord.js';
import config from '../../config';
import { elasticClient } from '../../dbConnection';
import { ItemTag, PRETTY_TAG_NAMES } from '../../utils/itemTypeData';
import { capitalize } from '../../utils/misc';

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
    let embedBody: string =
        `**Tags:** ${tags}\n` +
        `**Level:** ${mainResult.level}\n` +
        `**Damage:** ${Util.escapeMarkdown(mainResult.damage) || '0-0'}\n` +
        `**Element:** ${mainResult.elements.map(capitalize).join(' / ') || 'N/A'}\n` +
        `**Bonuses:** ${bonuses}`;
    return {
        url: mainResult.link,
        title: mainResult.full_title,
        description: embedBody,
        image: { url: mainResult.images[0] },
        fields: [{ name: 'Attacks', value: attacks }],
    };
}

export async function getPetSearchResult(
    term: string,
    maxLevel?: number
): Promise<{ message: MessageEmbedOptions; noResults: boolean }> {
    const query: { [key: string]: any } = { bool: {} };
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
    term = words.join(' ');

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
                    fuzziness: 'AUTO:4,7',
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
    if (maxLevel !== undefined) {
        additionalFilters.push({ range: { level: { lte: maxLevel } } });
    }

    if (additionalFilters.length) {
        query.bool.filter = additionalFilters;
    }

    const { body: responseBody } = await elasticClient.search({
        index: config.PET_INDEX_NAME,
        body: {
            size: 4,
            query: {
                function_score: {
                    query,
                    script_score: {
                        script: {
                            source: `
                            if (doc['scaled_damage'].value) {
                                return 10;
                            }
                            return (doc['level'].value / 10)`,
                        },
                    },
                    boost_mode: 'sum',
                },
            },
        },
    });

    return {
        message: formatResult(responseBody.hits.hits),
        noResults: !responseBody.hits.hits.length,
    };
}

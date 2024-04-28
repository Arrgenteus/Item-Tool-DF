import { fetchAutocompleteItemResults } from '../interactionLogic/search/search.js';
const command = {
    names: ['test'],
    run: async () => {
        const res = await fetchAutocompleteItemResults({
            term: 'tooth',
            itemSearchCategory: 'weapon',
        });
        console.log(res);
    },
};
export default command;

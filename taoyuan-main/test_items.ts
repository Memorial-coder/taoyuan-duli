import { getItemById, ITEMS } from './src/data/items';

const fishFeed = getItemById('fish_feed');
console.log('fish_feed:', fishFeed ? 'FOUND' : 'MISSING');

const waterPurifier = getItemById('water_purifier');
console.log('water_purifier:', waterPurifier ? 'FOUND' : 'MISSING');

console.log('Total items:', ITEMS.length);

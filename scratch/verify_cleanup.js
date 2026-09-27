import fs from 'fs';

const appContent = fs.readFileSync('app.js', 'utf8');

const setItemMatches = appContent.match(/localStorage\.setItem\(\s*['"]learnmap_child_profiles['"]/g);
const getItemMatches = appContent.match(/localStorage\.getItem\(\s*['"]learnmap_child_profiles['"]/g);
const removeItemMatches = appContent.match(/localStorage\.removeItem\(\s*['"]learnmap_child_profiles['"]/g);

console.log('setItem learnmap_child_profiles count:', setItemMatches ? setItemMatches.length : 0);
console.log('getItem learnmap_child_profiles count:', getItemMatches ? getItemMatches.length : 0);
console.log('removeItem learnmap_child_profiles count:', removeItemMatches ? removeItemMatches.length : 0);

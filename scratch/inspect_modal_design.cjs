const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8').split('\n');

html.forEach((l, i) => {
    if (l.includes('id="storyModal"') || l.includes('id="simulationModal"') || l.includes('mobile-bottom-nav')) {
        console.log((i+1) + ': ' + l.trim());
    }
});

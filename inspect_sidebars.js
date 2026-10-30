import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');
const s = html.indexOf('<section class="academy-sidebar-section" id="academySidebar"');
const e = html.indexOf('</section>', s);
console.log(html.slice(s, e + 10));

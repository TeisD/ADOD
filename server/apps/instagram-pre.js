const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const Page = require('../../shared/modules/Page');

dotenv.config();

/**
 * Main function
 */
function start() {
  const args = process.argv.slice(2);
  if (!args.length) run();
  if (args.includes('extract')) extract();
}

/**
 * Main logic
 */
function run() {
	console.log('[INFO] Main logic is not implemented');
	console.log('run instaloader instead');
	console.log('instaloader --fast-update --no-videos --metadata-json "#salonedelmobile" "#milandesignweek" "#milanodesignweek" "#milandesign" "#mdw2018" "#mdw18" "#fuorisalone" "#fuorisalone2018" "#fuorisalone18" "#designweek" "#salone2018" "#salone18"');
}

/**
 * Extract keywords from pages
 */
function extract() {
  console.log('Starting extraction');
  var pages = Page.loadFolder(path.join(process.env.DATA_DIR, 'pages'));

  let keywords = [];

  pages.forEach(page => {
    page.blocks.forEach(block => {
      block.lines.forEach(line => {
        if(!line.hasOwnProperty('hashtags')) return;
        line.hashtags.forEach(hashtag => {
          keywords.push(hashtag);
        })
      })
    })
  });

  keywords = _.uniq(keywords);

  keywords = '#' + keywords.join('\n#') + '';

  let out = path.join(process.env.DATA_DIR, 'instagram', 'hashtags.txt');

  fs.writeFileSync(out, keywords);
  console.log('Saved hashtags to ' + out);
}

// search
// grep --include=\*.txt -rwil . -e 'keyword'
// two files
// AND grep --include=\*.txt -rwilZ . -e 'coffee' | xargs -0 grep -il -e 'time'
// OR grep --include=\*.txt -rwil . -e 'time.*coffee\|coffee.*time'

// -l -> filenmame only
// -r -> recursive (directories)
// -w -> word match
// -i -> ignore case
// -Z -> zero byte (for piping)

start();
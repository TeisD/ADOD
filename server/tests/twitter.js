const Twit = require('twit');
const moment = require('moment');
const dotenv = require('dotenv').config();
const path = require('path');
const Page = require('../../shared/modules/Page');

const pages = Page.loadFolder(path.join(process.env.DATA_DIR, 'pages'));

const keywords = [];

pages.forEach((page) => {
    page.blocks.forEach((block) => {
      block.lines.forEach((line) => {
        const keyword = line.text;
        line.twitter.forEach((tag) => {
          keywords.push({
            keyword: keyword,
            tag: tag
          });
        })
      });
    })
});

const CLIENTS = require('../../shared/config/keys/twitter-clients.json');
const QUERIES = [
  {
    "type": "keyword",
    "client": {
      consumer_key: CLIENTS[0].consumer_key,
      consumer_secret: CLIENTS[0].consumer_secret,
      access_token: CLIENTS[0].access_token,
      access_token_secret: CLIENTS[0].access_token_secret
    },
    "track": keywords.map(k => {
      var t = k.tag;
      // remove quotes (not supported in statuses/filter)
      if(t[0] == '"') t = t.substring(1, t.length - 1);
      t = t.replace(/-/g, ' ');
      return t;
    })
  }
];

start();

/**
 * Main function
 */
function start() {
  const args = process.argv.slice(2);
  if (!args.length) run();
  if (args.includes('setup')) setup();
}

/**
 * Run the scraper
 */
function run() {
  console.log('[INFO] Listening for tweets');

  QUERIES.forEach((query) => {

    var T = new Twit({
      consumer_key: query.client.consumer_key,
      consumer_secret: query.client.consumer_secret,
      access_token: query.client.access_token,
      access_token_secret: query.client.access_token_secret
    });

    var stream = T.stream('statuses/filter', {
      track: query.track,
    });

    stream.on('tweet', function (tweet) {

        if(typeof tweet.quoted_status === 'object') return;

        if(typeof tweet.retweeted_status === 'object') {
          tweet = tweet.retweeted_status;
        }

        if(tweet.in_reply_to_status_id !== null) return;
        if(tweet.in_reply_to_status_id_str !== null) return;
        if(tweet.in_reply_to_user_id !== null) return;
        if(tweet.in_reply_to_user_id_str !== null) return;
        if(tweet.in_reply_to_screen_name !== null) return;
        if(tweet.entities.urls && tweet.entities.urls.length) return;
        if(tweet.entities.media && tweet.entities.media.length) return;

        const text = parseText(tweet);
        const keyword = findKeyword(text);

        if(typeof keyword === 'undefined') return;

        console.log(keyword);
        console.log(text);
        console.log("---")


    })
  });
}

/**
 * Parse the twitter text
 */
function parseText(tweet) {
  if(typeof tweet.extended_tweet !== 'undefined') {
    return tweet.extended_tweet.full_text;
  } else {
    return tweet.text;
  }
}

function parseLocation(tweet) {
  if(tweet.coordinates !== null) {
    return tweet.coordinates.coordinates.join(',');
  }
  if(tweet.place !== null && tweet.place.name !== null) {
    return tweet.place.name;
  }
  return null
}

/**
 * Find the keyword the tweet originates from
 */
function findKeyword(text) {
  for(k of keywords) {
    const query = toRegEx(k.tag);
    if(text.search(query) !== -1) {
      return k.keyword;
    }
  }
}

function toRegEx(q) {
  if(q[0] == '"') {
    q = q.substring(1, q.length - 1)
    q = q.replace(/\W/g, "(\\W|\\s)*");
    q = new RegExp(q, "gim");
  } else {
    q = q.replace(/\s/g, ".*");
    q = new RegExp(q, "gim");
  }
  return q;
}
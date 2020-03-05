const mysql = require('mysql');
const Twit = require('twit');
const moment = require('moment');
const dotenv = require('dotenv');
const path = require('path');
const Page = require('../../shared/modules/Page');

dotenv.config();

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

const DB = process.env.DB;
const AUTH = require('../../shared/config/keys/mysql.json');
const CLIENTS = require('../../shared/config/keys/twitter-clients.json');
const QUERIES = [
  {
    "type": "hashtag",
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

if (!AUTH.host || !AUTH.user || !AUTH.password) throw 'Authentication file does not contain a valid password.'

var db = mysql.createConnection({
  host: AUTH.host,
  user: AUTH.user,
  password: AUTH.password,
  charset : 'utf8mb4',
  //debug: true
});

process.stdin.resume(); //so the program will not close instantly
console.log('Connection to database...');
db.connect(function(err) {
  if (err) throw err
  console.log('[OK] connected as id ' + db.threadId);
  start();
});

/**
 * Main function
 */
function start() {
  const args = process.argv.slice(2);
  if (!args.length) run();
  if (args.includes('setup')) setup();
}

/**
 * Setup the database
 */
function setup() {
  console.log('[INFO] Running setup script');
  db.query('CREATE DATABASE IF NOT EXISTS '+DB, function(err){
    if (err) throw err;
  });
  db.changeUser({database : DB}, function(err) {
    if (err) throw err;
  });
  db.query('ALTER DATABASE '+DB+' CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci', function(err) {
    if (err) throw err;
  });
  keywords.forEach(keyword => {
    const table = k.keyword
    db.query('CREATE TABLE IF NOT EXISTS '+table+' ( \
      id BIGINT UNSIGNED PRIMARY KEY, \
      parent BIGINT, \
      text TEXT NOT NULL, \
      user VARCHAR(50) NOT NULL, \
      user_name VARCHAR(100) NOT NULL, \
      user_avatar VARCHAR(250) NOT NULL, \
      created_at DATETIME NOT NULL, \
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)', function(err) {
      if (err) throw err;
    });
    db.query('ALTER TABLE '+table+' CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', function(err) {
      if (err) throw err;
    });
  })
}

/**
 * Run the scraper
 */
function run() {
  console.log('[INFO] Listening for tweets');

  db.changeUser({database : DB}, function(err) {
    if (err) throw err;
  });

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

      db.query('INSERT INTO '+keyword+'(id, parent, text, user, user_name, user_avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        tweet.id,
        (typeof tweet.retweeted_status !== 'undefined') ? tweet.retweeted_status.id : null,
        text,
        tweet.user.screen_name,
        tweet.user.name,
        tweet.user.profile_image_url_https,
        new Date(moment(tweet.created_at, "ddd MMM DD HH:mm:ss +ZZ YYYY")),
      ], function(err, results) {
        if (err) console.error('[ERROR] ' + err);
      });
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
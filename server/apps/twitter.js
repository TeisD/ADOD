const mysql = require('mysql');
const Twit = require('twit');
const moment = require('moment');

const DB = 'mdw_2018';
const TABLE = 'twitter';
const AUTH = require('../../config/keys/mysql.json');
const CLIENTS = require('../../config/keys/twitter-clients.json');
const QUERIES = [
  {
    "type": "hashtag",
    "client": {
      consumer_key: CLIENTS[0].consumer_key,
      consumer_secret: CLIENTS[0].consumer_secret,
      access_token: CLIENTS[0].access_token,
      access_token_secret: CLIENTS[0].access_token_secret
    },
    "track": [
      'milan design week',
      'milan design',
      'milano design week',
      'salone del mobile',
      'salone',
      'milan design',
      'mdw2018',
      'mdw18',
      'salone2018',
      'salone18',
      'milandesignweek',
      'salonedelmobile',
      'designweek',
      'iSaloniofficial',
			'fuorisalone',
			'fuorisalone18',
			'fuorisalone2018',
    ]
  },
  {
    "type": "location",
    "client": {
      consumer_key: CLIENTS[1].consumer_key,
      consumer_secret: CLIENTS[1].consumer_secret,
      access_token: CLIENTS[1].access_token,
      access_token_secret: CLIENTS[1].access_token_secret
    },
    "locations": [
      '9,45.35,9.35,45.6'
    ]
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
    if (err) throw error;
  });
  db.changeUser({database : DB}, function(err) {
    if (err) throw err;
  });
  db.query('CREATE TABLE IF NOT EXISTS '+TABLE+' ( \
    id BIGINT UNSIGNED PRIMARY KEY, \
    parent BIGINT, \
    text TEXT NOT NULL, \
    created_at DATETIME NOT NULL, \
    location VARCHAR(50), \
    type VARCHAR(10) NOT NULL, \
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)', function(err) {
    if (err) throw err;
  });
  db.query('ALTER DATABASE '+DB+' CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci', function(err) {
    if (err) throw err;
  });
  db.query('ALTER TABLE '+TABLE+' CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', function(err) {
    if (err) throw err;
  });
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
      locations: query.locations,
      language: 'en'
    });

    stream.on('tweet', function (tweet) {
      console.log(+new Date);
      db.query('INSERT INTO '+TABLE+'(id, parent, text, created_at, location, type) VALUES (?, ?, ?, ?, ?, ?)', [
        tweet.id,
        (typeof tweet.retweeted_status !== 'undefined') ? tweet.retweeted_status.id : null,
        parseText(tweet),
        new Date(moment(tweet.created_at, "ddd MMM DD HH:mm:ss +ZZ YYYY")),
        parseLocation(tweet),
        query.type,
      ], function(err, results) {
        if (err) console.error('[ERROR] ' + e);
      });
    })
  });
}

/**
 * Parse the twitter text
 */
function parseText(tweet) {
  if(tweet.retweeted_status && typeof tweet.retweeted_status.extended_tweet !== 'undefined') {
    return tweet.retweeted_status.extended_tweet.full_text;
  } else if(typeof tweet.extended_tweet !== 'undefined') {
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
 * Exit handler and events
 */
function exitHandler(options, err) {
  console.log('[INFO] Closing database connection');
  db.end(function(err) {
    if (err) throw err;
    process.exit();
  });
}
process.on('exit', exitHandler);
process.on('SIGINT', exitHandler);
process.on('SIGUSR1', exitHandler);
process.on('SIGUSR2', exitHandler);
process.on('uncaughtException', exitHandler);

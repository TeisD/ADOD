const { exec } = require("child_process");
const mysql = require('mysql');
const moment = require('moment');
const dotenv = require('dotenv');
const path = require('path');
const Page = require('../../shared/modules/Page');

const AUTH = require('../../shared/config/keys/mysql.json');

const DB = "ADOD-dev"
const COMMAND_BASE = "scrape-twitter search --query"
const COMMAND_FLAGS = "--type latest"

dotenv.config();

const pages = Page.loadFolder(path.join(process.env.DATA_DIR, 'pages'));

const keywords = [];

pages.forEach((page) => {
    page.blocks.forEach((block) => {
      block.lines.forEach((line) => {
        const keyword = line.text;
        const id = line._id;
        line.twitter.forEach((tag) => {
          keywords.push({
            id: id,
            keyword: keyword,
            tag: tag
          });
        })
      });
    })
});

if (!AUTH.host || !AUTH.user || !AUTH.password) throw 'Authentication file does not contain a valid password.'

var db = mysql.createConnection({
  host: AUTH.host,
  user: AUTH.user,
  password: AUTH.password,
  charset : 'utf8mb4',
  //debug: true
});

console.log('Connection to database...');
db.connect(function(err) {
  if (err) throw err
  console.log('[OK] connected as id ' + db.threadId);
  start();
});

function start(){
  db.changeUser({database : DB}, function(err) {
    if (err) throw err;
  });

  for(let i = 0; i < 1; i++) {
    let keyword = keywords[i].tag;
    let tableName = keywords[i].keyword;
    let timeout = i*2000;

    setTimeout(() => {
      scrape(keyword, tableName)
    }, timeout);
  }
}

function scrape(keyword, tableName) {
  exec(`${COMMAND_BASE} ${encodeURIComponent(keyword)} ${COMMAND_FLAGS}`, (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }

    parse(stdout, tableName);

  });
}

function parse(stdout, tableName) {
  let data = JSON.parse(stdout)
  let tweets = [];
  

  for(let i = 0; i < data.length; i++) {
    let tweet = data[i];
    if(tweet.images.length) continue;
    if(tweet.urls.length) continue;
    if(tweet.isRetweet) continue;
    //if(tweet.isReplyTo) continue;
    tweets.push(tweet);
  }

  for(let i = 0; i < tweets.length; i++) {
    let tweet = tweets[i];

    //tweet.id
    //tweet.screenName
    //tweet.time
    //tweet.text

    db.query('INSERT INTO `'+getTableName(tableName)+'` (id, text, user, user_name, user_avatar, created_at, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id', [
      tweet.id,
      tweet.text,
      tweet.screenName,
      tweet.screenName,
      null,
      new Date(tweet.time),
      new Date(tweet.time)
    ], function(err, results) {
      if (err) console.error('[ERROR] ' + err);
    });

  }

  console.log(`Found ${tweets.length}/${data.length} relevant tweets`);

}

function getTableName(keyword) {
  const extra = keyword.indexOf('(');
  if(extra != -1) {
    keyword = keyword.substring(0, extra);
  }
  keyword = keyword.trim();
  keyword = keyword.replace(/\s/g, "_");
  return keyword;
}
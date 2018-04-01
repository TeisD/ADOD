const mysql = require('mysql');

const DB = 'mdw_2018';
const TABLE = 'instagram';
const AUTH = require('../../config/keys/mysql.json');

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
    text TEXT NOT NULL, \
		url TEXT NOT NULL, \
    created_at DATETIME NOT NULL, \
		likes INT, \
		video BOOL, \
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
 * Main logic
 */
function run() {
	console.log('[INFO] Main logic is not implemented');
	console.log('run instaloader instead');
	console.log('instaloader --fast-update --no-videos --metadata-json "#salonedelmobile" "#milandesignweek" "#milanodesignweek" "#milandesign" "#mdw2018" "#mdw18" "#fuorisalone" "#fuorisalone2018" "#fuorisalone18" "#designweek" "#salone2018" "#salone18"');
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

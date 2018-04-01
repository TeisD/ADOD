const fs = require('fs');
const http = require('http');
const querystring = require('querystring');

const PORT = 3000;
const KEY = fs.readFileSync('../../config/keys/api-key', 'utf8')

const server = http.createServer((request, response) => {
	request.on('error', (err) => {
    console.error('[ERROR] ' + err);
    response.statusCode = 400;
    response.end();
  });

	response.on('error', (err) => {
    console.error('[ERROR] ' + err);
  });

	if(request.method === 'POST') {
		let body = '';

		request.on('data', (chunk) => {
			body += chunk;
		}).on('end', () => {
			body = querystring.parse(body);

			response.statusCode = 200;
			response.setHeader('Content-Type', 'application/json');

			if(body.key == KEY) {
				switch(request.url){
					case '/instagram':
						response.end(JSON.stringify(instagram()));
						break;
					case '/search':
						response.end(JSON.stringify(search()));
						break;
					case '/neuraltak':
						response.end(JSON.stringify(neuraltalk()));
						break;
				}
			}
			response.statusCode = 404;
			response.end();
		});
	} else {
		response.statusCode = 404;
		response.end();
	}

}).listen(PORT);

server.on('error', function (err) {
  console.error('[ERROR] ' + err);
});

function instagram() {
	return 'yummy';
}

function search() {
}

function neuraltalk() {
}

"use latest";
const Express = require('express');
const Webtask = require('webtask-tools');
const app = Express();
const http = require('http');
const url = require('url');

const API_KEY = '272c1196810f2f4f96033ff4efb24fbb2170e933';
const API_USER = 'kizer@kizer.com.ng';
const API_URL = 'http://api.ebulksms.com:8080/sendsms.json';

app.use(require('body-parser').json());

// POST
app.post('*', function (req, res) {
	var type = req.headers['x-github-event'];
    console.log('Event type =>', type);

    var body = req.body;
    console.log('Processing request =>', body);

    var smsBody = processNotification(body, type);
    console.log('SMS to send =>', smsBody);

    // TODO: implement phone number verification
    console.log('QUERY STRING', req.query);
    var toNumber = req.query.to;
    var fromNumber = req.query.from || 'Github0';
    console.log('Sending message to =>', toNumber);
    console.log('Sending message from =>', fromNumber);

    // We must have a number to send SMS to, and it should come from the URL
    if (!toNumber) {
    	return res.status(422).json({error: 1, code: 0x03, message: 'Target phone number missing'});
    }

    // If the returned SMS body is empty of falsey, fail
    if (!smsBody) {
    	return res.status(422).json({error: 1, code: 0x02, message: 'SMS cannot be sent'});
    }

    // If the processor returns boolean TRUE, do not send SMS. Just send success.
    if (smsBody === true) {
		return res.status(200).json({success: true});
    }

    sendSMS(toNumber, fromNumber, smsBody, function (err) {
    	if (err) {
    		res.status(422).json({error: 1, code: 0x01, message: 'SMS gateway failed'});
		    console.error('NOT Sent SMS =>', err);
    	} else {
    		res.status(200).json({success: true});
		    console.log('Sent SMS =>', smsBody);
    	}
    });
});

/**
 * Send SMS to a number
 * @param {String} toNumber Phone number to send SMS to
 * @param {String} fromNumber Phone number to set in the "from" field
 * @param {String} text SMS text
 * @param {Function} callback Standard node.js callback
 */
function sendSMS (toNumber, fromNumber, text, callback) {
	// TODO: Implement
	text = truncateSMSText(text);

	var msg = {
		"SMS": {
		    "auth": {
		        "username": API_USER,
		        "apikey": API_KEY
		    },
		    "message": {
		        "sender": fromNumber,
		        "messagetext": text,
		        "flash": "0"
		    },
		    "recipients":
		    {
		        "gsm": [
		            {
		                "msidn": toNumber,
		                "msgid": String(new Date().getTime() + Math.random())
		            }
		        ]
		    }
		}
	};

	msg = JSON.stringify(msg);

	var parsedUrl = url.parse(API_URL);

	var options = {
	  host: parsedUrl.hostname,
	  protocol: parsedUrl.protocol,
	  path: parsedUrl.path,
	  port: parsedUrl.port,
	  method: 'POST',
	  headers: {
	  	'content-type': 'application/json',
	  	'content-length': msg.length
	  }
	};

	var cb = function(response) {
	  var str = '';

	  console.log('SERVER RESPONSE =>', response.statusCode);

	  if (response.statusCode > 399) {
	  	return callback(new Error('API Error'));
	  }

	  response.on('data', function (chunk) {
	    str += chunk;
	  });

	  response.on('error', function () {
	    console.log('SMS API ERROR =>', arguments);
	    callback(new Error('API Error'));
	  });

	  response.on('end', function () {
	    console.log('SMS API RESPONSE =>', str);
	    callback(null, JSON.parse(str));
	  });
	};

	var request = http.request(options, cb);
	request.write(msg);
	request.end();
}

/**
 * Process a github notification object and return an SMS-able text
 * @param {Object} notif The github notification
 * @param {String} type The notification type (See https://developer.github.com/webhooks/#events)
 * @return {String} Returns an SMS-able string
 */
function processNotification (notif, type) {
	console.log('Processing SMS notification type =>', type);
	// The type processors maps the different notification types to processing functions
	var typeProcessors = {
		commit_comment: commitCommentNotificationProcessor,
		ping: function () {
			return true;
		}
	};

	if (typeProcessors[type]) {
		var repoName = getRepositoryName(notif.repository);
		var text = typeProcessors[type](notif);

		if (text) {
			return `${repoName}: ${text}`;
		}
	}

	return null;
}

/**
 * Processor for commit comments
 * @param {Object} notif A notification object
 * @return {String|null} Returns an SMS message from the notification or null if unsupported
 */
function commitCommentNotificationProcessor (notif) {
	console.log('Notification action =>', notif.action);
	var sender = getSenderName(notif.sender);
	var commitId = truncateCommitId(notif.comment.commit_id);
	var body = notif.comment.body;

	switch (notif.action) {
		case 'created':
			return `${sender} commented on ${commitId}: ${body}`;
			break;

		default:
			// Unknown or unsupported action. Returning null forces an abort.
			return null;
			break;
	}
}

/**
 * Truncate a notification message to SMS size (160 chars). Note that this does not consider multibyte characters.
 * @param {String} text The text to be truncated
 * @return {String} Returns the input text, truncated (and ellipsisised) to single SMS page
 */
function truncateSMSText (text) {
	if (text.length < 160) {
		return text;
	}

	return text.slice(0, 157) + '...';
}

/**
 * Get the name of a repository from a github repository object
 * @param {Object} repository A github repository object
 * @return {String} Returns the full repository name in the form of user/repo_name
 */
function getRepositoryName (repository) {
	return repository.full_name;
}

/**
 * Get an SMS-able sender name from a github sender object
 * @param {Object} sender The github sender object
 * @return {String} Returns an SMS-able sender's name
 */
function getSenderName (sender) {
	return sender.login;
}

/**
 * Truncate a standard SHA1 commit ID to a few characters
 * @param {String} commitId The commit ID to truncate
 * @return {String} Returns the truncated commit ID
 */
function truncateCommitId (commitId) {
	return commitId.slice(0, 7);
}

/**
 * Verify that the github message is coming from github using our configured secret
 */
function verifyGithubMessage () {
	// TODO: implement
}

module.exports = Webtask.fromExpress(app);
// app.listen(1209, function () {
// 	console.log('Listening on port 1209');
// });

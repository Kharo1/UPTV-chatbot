/*
 *UPTV chatbot
 *@author: Kevin Haro
 */
'use strict'

const express = require('express'),
 			bodyParser = require('body-parser'),
 			request = require('request'),
 			app = express()

//ports and communication
app.set('port', (process.env.PORT || 5000))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

//inject access tokens as environmental variables, e.g.
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN,
			VALIDATON_TOKEN = process.env.VALIDATON_TOKEN,
			APP_SECRET = process.env.APP_SECRET


// index check to see if server is available
app.get('/', function (req, res) {
	res.send('Hello I am the new UPTV bot :)')
})

// for facebook verification
app.get('/', function (req, res) {
	if (req.query['hub.verify_token'] === VALIDATON_TOKEN) {
		res.send(req.query['hub.challenge'])
	} else {
		res.send('Error, wrong token')
	}
})

//Listen to the number of messages user posts
app.post('/', function(req, res) {
	let messaging_events = req.body.entry[0].messaging
	for (let i = 0; i < messaging_events.length; i++) {
		let event = messaging_events[i]
		let sender = event.sender.id
		if (event.message && event.message.text) {
			let text = event.message.text
      greet(sender)
		}
	}
	res.sendStatus(200)
})

function greet(sender){
  let greeting = {  text :"Hi {{user_first_name}}, welcome to this bot."}
  sendRequest(sender,greeting)
}

function sendRequest(sender, message){
  request({
		url: "https://graph.facebook.com/v2.6/me/messages",
		qs : {access_token: PAGE_ACCESS_TOKEN},
		method: "POST",
		json: {
			recipient: {id: sender},
			message : message,
		}
	}, function(error, response, body) {
		if (error) {
			console.log("sending error")
		} else if (response.body.error) {
			console.log("response body error")
		}
	})
}




// listen for server
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})

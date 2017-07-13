/*
 *UPTV chatbot
 *@author: Kevin Haro
 */
'use strict'

const express = require('express'),
 			bodyParser = require('body-parser'),
 			request = require('request'),
      crypto = require('crypto'),
      fetch = require('node-fetch'),
 			app = express()

let wit = require('node-wit').Wit,
    log = require('node-wit').log


//ports and communication
app.set('port', (process.env.PORT || 5000))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

//inject access tokens as environmental variables, e.g.
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN,
			VALIDATON_TOKEN = process.env.VALIDATON_TOKEN,
			APP_SECRET = process.env.APP_SECRET,
      WIT_ACCESS_TOKEN = process.env.WIT_ACCESS_TOKEN


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

//contains all user sessions
//each session has an entry
const sessions = {}
const findOrCreateSession = (fbid) =>{
  let sessionID
  //check to see if session for user already exists
  Object.keys(sessions).forEach(k => {
    if(sessions[k].fbid === fbid){
      //session already exists
      sessionID = k
    }
  })
    if(!sessionID){
      //no session found for fbid facebook user, need to create one
      sessionID = new Date().toISOString()
      sessions[sessionID] = {fbid: fbid, context:{}}
    }
    return sessionID
}

//Search sessions and make call to reply to user
const actions = {
  send({sessionID},{text}){
    //retrieve user id to reply to facebook user
    const recipientID = sessions[sessionID].fbid
    if(recipientID){
      //we found the recipient
      return sendRequest(recipientID,text)
      .then(() => null)
      .catch((err) =>{
        console.error(
          'Oops! An error occurred while forwarding the response to',
          recipientID,
          ':',
          err.stack || err
        )
      })
    }else{
      console.error('Could not find user for session:',sessionID)
      return Promise.resolve()
    }
  },
  //my responses goes here
}

//Listen to the number of messages user posts
app.post('/', function(req, res) {
	let messaging_events = req.body.entry[0].messaging
	for (let i = 0; i < messaging_events.length; i++) {
		let event = messaging_events[i]
		if (event.message && !event.message.is_echo) {
      const sender = event.sender.id
      const sessionId = findOrCreateSession(sender)
			const {text, attachments} = event.message
    if(attachments){
      //we recieved some sort of attachment
      sendRequest(sender, 'Sorry I can only process text messages for you right now :(')
      .catch(console.error)
    }else if(text){
    greet(sender)
    }
		}
	}
	res.sendStatus(200)
})

//greeting message
function greet(sender){
  let greeting = {  text :"Hi {{user_first_name}}, welcome to this bot."}
  sendRequest(sender,greeting)
}

//send message back to user
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

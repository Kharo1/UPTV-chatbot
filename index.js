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

let Wit = require('node-wit').Wit,
    log = require('node-wit').log

var programming_list = []


//ports and communication
app.set('port', (process.env.PORT || 5000))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

//inject access tokens as environmental variables, e.g.
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN,
			VALIDATON_TOKEN = process.env.VALIDATON_TOKEN,
			APP_SECRET = process.env.APP_SECRET,
      WIT_ACCESS_TOKEN = process.env.WIT_ACCESS_TOKEN

//retrieve programming list from server and store into local array
app.get("http://uptv.com/todays-tv-schedule-feed/", function(data) {
  programming_list = data.data.schedule
  //retrieve show programming_list[0]['show']
  //retrieve description programming_list[0]['description']
  //retrieve date programming_list[0]['date']
  //retrieve title programming_list[0]['short_title']
  //status on now? programming_list[0]['on_now']
  //retrieve number programming length programming_list.length
})

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
  let sessionId
  //check to see if session for user already exists
  Object.keys(sessions).forEach(k => {
    if(sessions[k].fbid === fbid){
      //session already exists
      sessionId = k
    }
  })
    if(!sessionId){
      //no session found for fbid facebook user, need to create one
      sessionId = new Date().toISOString()
      sessions[sessionId] = {fbid: fbid, context:{}}
    }
    return sessionId
}

//Search sessions and make call to reply to user
const actions = {
  send({sessionId},{text}){
    //retrieve user id to reply to facebook user
    const recipientID = sessions[sessionId].fbid
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
      console.error('Could not find user for session:',sessionId)
      return Promise.resolve()
    }
  },
  getResponse({context,entities}){
    greet(sender)
  },
  //my responses goes here
}

//set up bot
const wit = new Wit({
  accessToken: WIT_ACCESS_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
})

//Listen to the number of messages user posts
app.post('/', function(req, res) {
	let messaging_events = req.body.entry[0].messaging
	for (let i = 0; i < messaging_events.length; i++) {
		let event = messaging_events[i]
    const sender = event.sender.id
		if (event.message.text) {
      const sessionId = findOrCreateSession(sender)
			const text = event.message.text
      wit.runActions(
          sessionId, // the user's current session
          text, // the user's message
          sessions[sessionId].context // the user's current session state
        ).then((context) => {
          // Now it's waiting for further messages to proceed.
          console.log('Waiting for next user messages');

          // if (context['done']) {
          //   delete sessions[sessionId];
          // }
          // Updating the user's current session state
          sessions[sessionId].context = context;
        })
        .catch((err) => {
          console.error('Oops! Got an error from Wit: ', err.stack || err);
        })
    }else{
      sendRequest(sender, {text: "Sorry I can only proces text messages for you right now."})
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

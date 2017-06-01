"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
const opn = require("opn");
const vol = require("vol");

const token =
    process.env.FB_PAGE_ACCESS_TOKEN ||
    "EAAUdTbCZA0aoBAIlqZAC87lacdfgWoFyySJhJJ9LEFbZA2paNyT2o5hLPtmwOI9hsyWQy8hXOLShPA2aN2WIn9yx4BuPv2y6cjmzZBzDZCWUKE0qUrcImiEptea7OGOpWZBm29R0cXApZBd0DFLu9ye8rZAzPA534ZAVW01dPBicICgZDZD";

const YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";
const API_KEY = "AIzaSyBmzTvTcdLiafSUnFbm9YqlB7wz8og5AZI";

app.set("port", process.env.PORT || 5000);

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}));

// Process application/json
app.use(bodyParser.json());

// Index route
app.get("/", function (req, res) {
    res.send("Hello world, I am a chat bot hihi");
});

app.get("/youtube/", function (req, res) {
    res.sendFile("/youtube.html", {root: __dirname});
})

// for Facebook verification
app.get("/webhook/", function (req, res) {
    if (
        req.query["hub.mode"] === "subscribe" &&
        req.query["hub.verify_token"] === "my_voice_is_my_password_verify_me"
    ) {
        res.status(200).send(req.query["hub.challenge"]);
        return;
    }
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
});

app.post("/webhook/", function (req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object === "page") {
        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function (entry) {
            var pageID = entry.id;
            var timeOfEvent = entry.time;

            // Iterate over each messaging event
            entry.messaging.forEach(function (event) {
                if (event.message) {
                    console.log(entry.id);
                    receivedMessage(event);
                } else if (event.postback) {
                    receivedPostback(event);
                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });
    }

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
});

function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log(
        "Received message for user %d and page %d at %d with message:",
        senderID,
        recipientID,
        timeOfMessage
    );
    console.log(JSON.stringify(message));

    var messageId = message.mid;

    var messageText = message.text;
    var messageAttachments = message.attachments;

    getFbName(senderID).then(first_name => {
        if (messageText) {
            // Set nickname
            switch (senderID) {
                case '1176661302462412':
                    first_name = "Bà già xài Zalo";
                    break;
                case '1370107956411784':
                    first_name = "Zú";
                    break;
                case '738286506296286':
                    first_name = "chị đại";
                    break;
                case '1067670383333151':
                    first_name = "Tuấn Nguyễn";
                    break;
                case '1447875711972194':
                    first_name = "a Việt";
                    break;
                case '1843143285699478':
                    first_name = "admin";
                    break;
                case '1218099261649369':
                    first_name = "Hưng bồ Quyên";
                    break;
                default:
                    break;
            }

            //Check & open youtube link
            var videoId = getYoutubeVideoId(messageText);
            if (videoId) {
                opn(messageText, "music");
                sendTextMessage(senderID, "Ô kê quẩy lên " + first_name + "!!");
                return;
            }

            //Check & open zing mp3 link
            if (messageText.includes("mp3.zing.vn")) {
                opn(messageText, "music");
                sendTextMessage(
                    senderID,
                    "Ô kê quẩy luôn " + first_name + "!!"
                );
                return;
            }

            //Adjust volume
            if (
                messageText.includes("nín") ||
                messageText.includes("câm") ||
                messageText.includes("im")
            ) {
                vol.set(0, function (err) {
                    console.log("Volume muted");
                });
                sendTextMessage(senderID, "Zồi, im zồi đó " + first_name);
                return;
            } else if (messageText.includes("volume")) {
                let level = parseFloat(messageText.match(/\d+/)) / 100;
                if (level) {
                    vol.set(level, function (err) {
                        console.log("Changed volume to " + level * 100 + "%");
                    });
                    sendTextMessage(
                        senderID,
                        "Zồi, volume là " + level * 100 + "% zồi đó " + first_name
                    );
                } else {
                    vol.get(function (err, level) {
                        console.log(level);
                        sendTextMessage(
                            senderID,
                            "Volume đang là " + level * 100 + "% " + first_name + " ơi"
                        );
                    });
                }
                return;
            }

            //Default text
            switch (messageText) {
                case "generic":
                    sendGenericMessage(senderID);
                    break;

                default:
                    sendTextMessage(
                        senderID,
                        "Hong phải link youtube/zing mp3 ahihi " +
                        first_name +
                        " ngốc!"
                    );
                    break;
            }
        } else if (messageAttachments) {
            // sendTextMessage(senderID, "Message with attachment received");
        }
    });
}

function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;

    console.log(
        "Received postback for user %d and page %d with payload '%s' " +
        "at %d",
        senderID,
        recipientID,
        payload,
        timeOfPostback
    );

    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    sendTextMessage(senderID, "Postback called");
}

function sendGenericMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                            title: "rift",
                            subtitle: "Next-generation virtual reality",
                            item_url: "https://www.oculus.com/en-us/rift/",
                            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
                            buttons: [{
                                    type: "web_url",
                                    url: "https://www.oculus.com/en-us/rift/",
                                    title: "Open Web URL"
                                },
                                {
                                    type: "postback",
                                    title: "Call Postback",
                                    payload: "Payload for first bubble"
                                }
                            ]
                        },
                        {
                            title: "touch",
                            subtitle: "Your Hands, Now in VR",
                            item_url: "https://www.oculus.com/en-us/touch/",
                            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
                            buttons: [{
                                    type: "web_url",
                                    url: "https://www.oculus.com/en-us/touch/",
                                    title: "Open Web URL"
                                },
                                {
                                    type: "postback",
                                    title: "Call Postback",
                                    payload: "Payload for second bubble"
                                }
                            ]
                        }
                    ]
                }
            }
        }
    };

    callSendAPI(messageData);
}

function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(messageData) {
    request({
            uri: "https://graph.facebook.com/v2.6/me/messages",
            qs: {
                access_token: token
            },
            method: "POST",
            json: messageData
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var recipientId = body.recipient_id;
                var messageId = body.message_id;

                console.log(
                    "Successfully sent generic message with id %s to recipient %s",
                    messageId,
                    recipientId
                );
            } else {
                console.error("Unable to send message.");
                console.error(response);
                console.error(error);
            }
        }
    );
}

// Spin up the server
app.listen(app.get("port"), function () {
    console.log("running on port", app.get("port"));
});

function getFbName(senderID) {
    return new Promise((resolve, reject) => {
        request({
                url: "https://graph.facebook.com/v2.9/" + senderID,
                qs: {
                    fields: "first_name",
                    access_token: token
                },
                method: "GET"
            },
            function (error, response, body) {
                if (error) {
                    console.log("Error request name: ", error);
                    reject(error);
                } else if (response.body.error) {
                    console.log("Error getting fb name: ", response.body.error);
                    reject(response.body.error);
                } else {
                    body = JSON.parse(body);
                    console.log("Got name: ", body.first_name);
                    resolve(body.first_name);
                }
            }
        );
    });
}

function requestMusic(sender, url) {}

function getYoutubeVideoId(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    return match && match[7].length == 11 ? match[7] : false;
}
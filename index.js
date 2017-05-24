"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
const opn = require("opn");
const vol = require("vol");

const token = process.env.FB_PAGE_ACCESS_TOKEN;

const YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";
const API_KEY = "AIzaSyBmzTvTcdLiafSUnFbm9YqlB7wz8og5AZI";

app.set("port", process.env.PORT || 5000);

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// Process application/json
app.use(bodyParser.json());

// Index route
app.get("/", function(req, res) {
    res.send("Hello world, I am a chat bot hihi");
});

// for Facebook verification
app.get("/webhook/", function(req, res) {
    if (req.query["hub.verify_token"] === "my_voice_is_my_password_verify_me") {
        res.send(req.query["hub.challenge"]);
    }
    res.send("Error, wrong token");
});

app.post("/webhook/", function(req, res) {
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i];
        let sender = event.sender.id;
        let name = getFbName(sender);
        if (event.message && event.message.text) {
            let text = event.message.text;

            var id = getYoutubeVideoId(text);

            if (id) {
                opn(text);
                sendTextMessage(sender, "Ô kê quẩy lên!!");
                continue;
            }

            if (text.includes("mp3.zing.vn")) {
                opn(text);
                sendTextMessage(sender, "Ô kê quẩy luôn!!");
                continue;
            }

            if (
                text.includes("nín") ||
                text.includes("câm") ||
                text.includes("im")
            ) {
                vol.set(0, function(err) {
                    console.log("Volume muted");
                });
                sendTextMessage(sender, "Zồi, im zồi");
                continue;
            } else if (text.includes("volume")) {
                let level = parseFloat(text.match(/\d+/)) / 100;
                if (level) {
                    vol.set(level, function(err) {
                        console.log("Changed volume to " + level * 100 + "%");
                    });
                    sendTextMessage(
                        sender,
                        "Zồi, volume là " + level * 100 + "% zồi đó"
                    );
                } else {
                    vol.get(function(err, level) {
                        console.log(level);
                        sendTextMessage(
                            sender,
                            "Volume đang là " + level * 100 + "% bạn ơi"
                        );
                    });
                }
                continue;
            }

            sendTextMessage(
                sender,
                "Hong phải link youtube/zing mp3 ahihi đồ ngốc!"
            );
            // sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
        }
    }
    res.sendStatus(200);
});

// Spin up the server
app.listen(app.get("port"), function() {
    console.log("running on port", app.get("port"));
});

function getFbName(sender) {
    request(
        {
            url: "https://graph.facebook.com/" +
                sender +
                "?fields=name&access_token=",
            qs: { access_token: token },
            method: "GET"
        },
        function(error, response, body) {
            if (error) {
                console.log("Error request name: ", error);
                return false;
            } else if (response.body.error) {
                console.log("Error: ", response.body.error);
                return false;
            } else {
                return response;
            }
        }
    );
}

function sendTextMessage(sender, text) {
    let messageData = { text: text };
    request(
        {
            url: "https://graph.facebook.com/v2.6/me/messages",
            qs: { access_token: token },
            method: "POST",
            json: {
                recipient: { id: sender },
                message: messageData
            }
        },
        function(error, response, body) {
            if (error) {
                console.log("Error sending messages: ", error);
            } else if (response.body.error) {
                console.log("Error: ", response.body.error);
            }
        }
    );
}

function requestMusic(sender, url) {}

function getYoutubeVideoId(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    return match && match[7].length == 11 ? match[7] : false;
}

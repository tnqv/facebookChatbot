"use strict";
const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
const opn = require("opn");
const vol = require("vol");
const mongodb = require("mongodb");
const sendMessage = require("./send_message.js");
//----socket io
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const fs = require("fs");

const parseString = require('xml2js').parseString;

const devMode = process.env.NODE_ENV;

const token = devMode === 'development' ? process.env.FB_VUCUTE_PAGE_ACCESS_TOKEN : process.env.FB_PAGE_ACCESS_TOKEN;

const YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const API_ZING_MP3_GETLINK_URL = "http://api.mp3.zing.vn/api/mobile/song/getsonginfo?requestdata=";

const mongodbUrl = process.env.MONGOLAB_URI;

var MongoClient = mongodb.MongoClient;

var socketClient = null;
io.on("connection", function(client) {
    socketClient = client;
    console.log("Client connected...");
    client.emit("messages", { msg: "Hello from server" });

    client.on("join", function(data) {
        console.log(data);
    });
});

server.listen(process.env.PORT || 5000, function() {
    console.log("running on port", 5000);
});

// Process application/x-www-form-urlencoded
app.use(
    bodyParser.urlencoded({
        extended: false
    })
);

// Process application/json
app.use(bodyParser.json());

// Index route
app.get("/", function(req, res) {
    res.send("Hello world, I am a chat bot hihi");
});

app.get("/youtube/", function(req, res) {
    res.sendFile("/youtube.html", { root: __dirname });
});

app.get("/client-control/",function(req,res){
    res.sendFile("/control.html", { root: __dirname });
});

app.post("/client-control/", function(req, res) {
    res.sendFile("/control.html", { root: __dirname });
});

// for Facebook verification
app.get("/webhook/", function(req, res) {
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

app.post("/webhook/", function(req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object === "page") {
        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
            var pageID = entry.id;
            var timeOfEvent = entry.time;

            // Iterate over each messaging event
            entry.messaging.forEach(function(event) {
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

function insertSongToDatabase(songUrl) {
    console.log("song url", songUrl);
    MongoClient.connect(mongodbUrl, (err, db) => {
        db.collection("songs").count().then(count => {
            if (count < 10) {
                db.collection("songs").insert({ song_url: songUrl }).then(result => {
                    db.close();
                });
            } else db.close();
        });
    });
}

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

    getFbName(senderID)
        .then(first_name => {
            if (messageText) {
                // Set nickname
                switch (senderID) {
                    case "1176661302462412":
                        first_name = "Bà già xài Zalo";
                        break;
                    case "1370107956411784":
                        first_name = "Zú";
                        break;
                    case "738286506296286":
                        first_name = "Chị Đại";
                        break;
                    case "1067670383333151":
                        first_name = "Tuấn Trẻ Trâu";
                        break;
                    case "1447875711972194":
                        first_name = "a Việt";
                        break;
                    case "1843143285699478":
                        first_name = "admin";
                        break;
                    case "1218099261649369":
                        first_name = "Cu Tũn";
                        break;
                    case "1434187019953992":
                        first_name = "Hoàng";
                        break;
                    default:
                        break;
                }

                //Check & open youtube link
                if(messageText.includes("youtube") || messageText.includes("youtu.be")){
                    var videoId = getYoutubeVideoId(messageText);
                    if (videoId) {
                        // , "music"
                        //opn(messageText, "music");
                        // getYoutubeDuration(videoId);
                        console.log("insert db", videoId);
                        if (socketClient != null) {
                            socketClient.emit("songs", { msg: videoId, videoType: "youtube" });
                        }

                        //insertSongToDatabase(messageText);
                        sendMessage.sendTextMessage(senderID, "Ô kê quẩy lên " + first_name + "!!");
                        return;
                    }
                }
                

                //Check & open zing mp3 link
                if (messageText.includes("mp3.zing.vn")) {
                    //opn(messageText, "music");
                    getMP3VideoId(messageText,function(data){
                        let urlReqAPI = API_ZING_MP3_GETLINK_URL + '{"id":"'+ data +'"}'
                        request.get(urlReqAPI,function(error,response,body){
                                if (!error && response.statusCode == 200) {
                                    
                                    let jsonObj = JSON.parse(body);
                                    
                                    //.source[ d'128']
                                     if (socketClient != null) {
                                        socketClient.emit("songs", { msg: jsonObj.source['128'], videoType: "zing" });
                                    }
                                    sendMessage.sendTextMessage(senderID, "Ô kê quẩy luôn " + first_name + "!!");
                                }
                        });
                    });
                    
                    return;
                }

                if(messageText.includes("nhaccuatui.com")){
                    getHTMLContentForNhacCuaTui(messageText,function(data){
                         request.get(data, function (error, response, body) {
                                if (!error && response.statusCode == 200) {
                                    let csv = body;
                                    parseString(csv, function (err, result) {
                                        let link;
                                        if (result.tracklist.track.length > 0) {
                                            let track = result.tracklist.track[0];
                                            let link = track.location[0];
                                            
                                             if (socketClient != null) {
                                                socketClient.emit("songs", { msg: link.trim(), videoType: "nhaccuatui" });
                                             }
                                        }                                    
                                    });
                                }
                            });
                    });
                }

                if (
                    messageText.includes("mute") ||
                    messageText.includes("nín") ||
                    messageText.includes("câm")
                ) {
                    if (socketClient != null) {
                        socketClient.emit("mute", {});
                    }
                }

                if (messageText.includes("unmute")) {
                    if (socketClient != null) {
                        socketClient.emit("unmute", {});
                    }
                }

                if (messageText.includes("dừng") || messageText.includes("pause")) {
                    if (socketClient != null) {
                        socketClient.emit("pause", {});
                    }
                }

                if (messageText.includes("stop")) {
                    if (socketClient != null) {
                        socketClient.emit("stop", {});
                    }
                }

                if (messageText.includes("resume")) {
                    if (socketClient != null) {
                        socketClient.emit("resume", {});
                    }
                }

                if (messageText.includes("set volume")) {
                    let arrayMessage = new Array();
                    arrayMessage = messageText.split(" ");
                    let volumeNumber = parseInt(arrayMessage[2]);
                    if (socketClient != null) {
                        socketClient.emit("setVolume", { volumeOption: volumeNumber });
                    }
                }

                //Default text
                switch (messageText) {
                    case "generic":
                        sendMessage.sendGenericMessage(senderID);
                        break;
                    case "volume":
                        sendMessage.sendQuickReplyMessage(senderID);
                        break;
                    default:
                        sendMessage.sendTextMessage(
                            senderID,
                            "Hong phải link youtube/zing mp3 ahihi " + first_name + " ngốc!"
                        );
                        break;
                }
            } else if (messageAttachments) {
                // sendTextMessage(senderID, "Message with attachment received");
            }
        })
        .catch(err => console.log(err));
}

function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;

    console.log(
        "Received postback for user %d and page %d with payload '%s' " + "at %d",
        senderID,
        recipientID,
        payload,
        timeOfPostback
    );

    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    sendMessage.sendTextMessage(senderID, "Postback called");
}

function getHTMLContentForNhacCuaTui(url,cb){
    request.get(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var csv = body;
            // Continue with your processing here.
            let splitHTML = csv.split("player.peConfig.xmlURL = ");
            let splitHTMLForXmlPath = splitHTML[1].split('"');
            // co mot. cai' rong^~ o? 0 nen phai lay' 1 nha
            cb(splitHTMLForXmlPath[1]);

            //const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
           // console.log(dom.window.document.querySelector("p").textContent); 
            //const $ = require('jQuery')(window);
            //console.log("jsdom",dom);
         //   test.window.document.addEventListener("DOMContentLoaded", function(event) {
         //   });
          
        }
    });
}

function getFbName(senderID) {
    return new Promise((resolve, reject) => {
        request(
            {
                url: "https://graph.facebook.com/v2.9/" + senderID,
                qs: {
                    fields: "first_name",
                    access_token: token
                },
                method: "GET"
            },
            function(error, response, body) {
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

function getYoutubeVideoId(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    console.log("url youtube", url);
    return match && match[7].length == 11 ? match[7] : false;
}

function getMP3VideoId(url,callback) {
    let splitStrArrFromUrl = url.split("/");
    let secondSplit = splitStrArrFromUrl[5].split(".");
    console.log("url Zing", url);
    callback(secondSplit[0] && secondSplit[0].length == 8 ? secondSplit[0] : false);
}

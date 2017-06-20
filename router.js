const receivedMsg = require("./receive_message.js");
const socketIo = require("./socket_io_manager.js");
const ds = require("./datasource.js");

var express = require("express");
var router = express.Router();

var returnRouter = function(io) {
    let socketClient = null;

    socketIo.getSocketClient(io, function(data) {
        socketClient = data;
    });
    socketIo.startSocketForAllRooms(io);
    // Index route
    router.get("/", function(req, res) {
        res.send("Hello world, I am a chat bot hihi");
    });

    router.get("/youtube/", function(req, res) {
        res.sendFile("/youtube.html", { root: __dirname });
    });

    router.get("/client-control/", function(req, res) {
        res.sendFile("/views/control.html", { root: __dirname });
    });

    router.post("/client-control/", function(req, res) {
        res.sendFile("/views/control.html", { root: __dirname });
    });

    router.get("/login", function(req, res) {
        res.sendFile("/views/login.html", { root: __dirname });
    });

    router.post("/login", function(req, res) {
        console.log(req.body.roomname);
        res.sendFile("/views/control.html", { root: __dirname });
    });
    // for Facebook verification
    router.get("/webhook/", function(req, res) {
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

    router.post("/webhook/", function(req, res) {
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
                        receivedMsg.receivedMessage(event,io);
                    } else if (event.postback) {
                        receivedMsg.receivedPostback(event);
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

    return router;
};

function isAuthenticated(req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated()) {
        return next();
    }

    // if they aren't redirect them to the home page
    res.redirect("/");
}

module.exports = returnRouter;

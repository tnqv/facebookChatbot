"use strict";
const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
const opn = require("opn");
const vol = require("vol");
const mongodb = require("mongodb");
const sendMessage = require("./send_message.js");
const get = require("./get_information_utils.js");
//----socket io
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var fs = require("fs");

const passport = require("passport");
const parseString = require("xml2js").parseString;

const devMode = process.env.NODE_ENV;

const token = devMode === "development"
    ? process.env.FB_VUCUTE_PAGE_ACCESS_TOKEN
    : process.env.FB_PAGE_ACCESS_TOKEN;

const YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const API_ZING_MP3_GETLINK_URL = "http://api.mp3.zing.vn/api/mobile/song/getsonginfo?requestdata=";

const mongodbUrl = process.env.MONGOLAB_URI;

var MongoClient = mongodb.MongoClient;

var router = require("./router");

// Process application/x-www-form-urlencoded
app.use(
    bodyParser.urlencoded({
        extended: false
    })
);

// Process application/json
app.use(bodyParser.json());

//set up routers for the whole app
app.use("/", router(io));

server.listen(process.env.PORT || 5000, function() {
    console.log("running on port", 5000);
});

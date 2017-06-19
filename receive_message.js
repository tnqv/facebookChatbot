const request = require("request");
const sendMessage = require("./send_message.js");
const get = require("./get_information_utils.js");
const API_ZING_MP3_GETLINK_URL = "http://api.mp3.zing.vn/api/mobile/song/getsonginfo?requestdata=";
const parseString = require('xml2js').parseString;
const ds = require("./datasource.js");
const socketIoManager = require("./socket_io_manager.js");

function insertSongToDatabaseHandler(messageText,videoType,senderID,videoUrlPlay){
                if(videoType === "youtube"){
                    ds.insertSongToDatabase(messageText,videoType,senderID);
                }else{
                    ds.insertSongToDatabase(messageText,"zing",senderID,videoUrlPlay);
                    // if (socketClient != null) {
                }
}
function emitMessageVideo(socketClient,videoId,videoType,videoUrlPlay,messageText,senderID){
                         ds.countIfIsThereAnySong(function(data){
                             
                                if(data.length > 0){

                                    insertSongToDatabaseHandler(messageText,videoType,senderID,videoUrlPlay)
                                }else{
                                    insertSongToDatabaseHandler(messageText,videoType,senderID,videoUrlPlay)
                                    if (socketClient != null) {
                                        if(videoType === "youtube"){
                                            socketClient.emit("songs", { msg: videoId, videoType: videoType });
                                        }else{
                                            socketClient.emit("songs", { msg: videoUrlPlay, videoType: videoType });
                                            
                                        }
                                    }
                                }
                        });
}

module.exports =  {
    receivedMessage : function(event,socketClient){
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

        get.getFbName(senderID)
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
                   
                    var videoId = get.getYoutubeVideoId(messageText);
                    if (videoId) {
                        // , "music"
                        //opn(messageText, "music");
                        // getYoutubeDuration(videoId);
                      
                        // if (socketClient != null) {
                        //     socketClient.emit("songs", { msg: videoId, videoType: "youtube" });
                        // }

                        //insertSongToDatabase(messageText);
                        
                        emitMessageVideo(socketClient,videoId,"youtube","",messageText,senderID);
                     
                        sendMessage.sendTextMessage(senderID, "Ô kê quẩy lên " + first_name + "!!");
                        return;
                    }

                    // khi song finish -> emit xem coi con` co' song nao` ko => neu ko thi`im , neu co tiep tuc. play 
                    // khi lan` dau` phat' thi` nhan. dc link se~ cho client biet la` co song de? phat'
                    // speaker chcek coi nhac co' dang phat' k , neu ko thi` play , ko thi` ko lam` gi` ca
                    

                    //Check & open zing mp3 link
                    if (messageText.includes("mp3.zing.vn")) {
                        //opn(messageText, "music");
                        get.getMP3VideoId(messageText,function(data){
                            let urlReqAPI = API_ZING_MP3_GETLINK_URL + '{"id":"'+ data +'"}'
                            request.get(urlReqAPI,function(error,response,body){
                                    if (!error && response.statusCode == 200) {
                                        
                                        let jsonObj = JSON.parse(body);
                                        
                                        //.source[ d'128']
                                        
                                        //     socketClient.emit("songs", { msg: jsonObj.source['128'], videoType: "zing" });
                                        // }
                                        emitMessageVideo(socketClient,messageText,"zing",jsonObj.source['128'],messageText,senderID);
                                        sendMessage.sendTextMessage(senderID, "Ô kê quẩy luôn " + first_name + "!!");
                                    }
                            });
                        });
                        
                        return;
                    }

                    if(messageText.includes("nhaccuatui.com")){
                        get.getHTMLContentForNhacCuaTui(messageText,function(data){
                            request.get(data, function (error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        parseString(body, function (err, result) {
                                            if (result.tracklist.track.length > 0) {
                                                let track = result.tracklist.track[0];
                                                let link = track.location[0];
                                                emitMessageVideo(socketClient,messageText,"nhaccuatui",link.trim(),messageText,senderID);
                                                sendMessage.sendTextMessage(senderID, "Ô kê quẩy luôn " + first_name + "!!");
                                                // if (socketClient != null) {
                                                //     socketClient.emit("songs", { msg: link.trim(), videoType: "nhaccuatui" });
                                                // }
                                                return;
                                            }                                    
                                        });
                                    }
                                });
                        });
                    }

                    if(messageText.includes("skip this song")){
                        if(socketClient != null){
                            socketClient.emit("skip",{});
                        }
                        return;
                    }
                    if(messageText.includes("current song")){
                        ds.findSongPlaying(function(data){
                            sendMessage.sendTextMessage(senderID,"Bài đang phát là : " + data[0].room_songs[0].song_name);
                        });
                        return;
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
    },
    receivedPostback : function(event){
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
}
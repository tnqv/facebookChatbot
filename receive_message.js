const request = require("request");
const sendMessage = require("./send_message.js");
const getInfoForUrl = require("./get_information_utils.js");
const API_ZING_MP3_GETLINK_URL = "http://api.mp3.zing.vn/api/mobile/song/getsonginfo?requestdata=";
const parseString = require("xml2js").parseString;
const ds = require("./datasource.js");
const socketIoManager = require("./socket_io_manager.js");
const BEGIN = 0;
const PRE_SELECT_ROOM = 1;
const SELECT_ROOM = 2;
const CHECK_PASSWORD = 3;
const CREATE_ROOM = 4;
const INPUT_PASSWORD_FOR_ROOM = 5;
const READY = 10;
// begin ( chat cau dau`) -> chua co room ( SELECT ROOM ) -> nhapp pass word (CHECK PASSWORD) -> vao room thanh` cong (READY)
let stateFlow = 1;

let userState = {}; // temp
let userSelectedRoom = {};
let userCreatedRoom = {};
//"123": { currentState: 0 }
// bấm previous -> load bài cuối cùng bên song played lên
// chuyển qua phần tử 1 -> songs
// songs sẽ lên 11 , song played sẽ bớt đi phần tử cuối
// tiếp tục previous -> songs lên 12 , songs played
function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (var i = 0; i < 5; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function checkNhacCuaTuiUrl(url){
    let patternNhacCuaTui = /http:\/\/www.nhaccuatui.com\/(bai-hat|video-clip)\/([a-zA-Z0-9-]+).([A-Za-z0-9]+).html/;
     if(patternNhacCuaTui.exec(url) != null){
                return url;
    }
    return false;
}

function insertSongToDatabaseHandler(
    roomIdentifier,
    messageText,
    songId,
    videoType,
    senderID,
    videoUrlPlay
) {

    ds.getNumberOfSongPromise("room_songs").then(data => {
        if (data[0].number_room_songs > 10) {
            sendMessage.sendTextMessage(senderID, "Full Queue mất tiu òi");
            return;
        } else {
            if (videoType === "youtube") {
                ds.insertSongToRoom(roomIdentifier, songId, messageText, videoType, senderID);
            } else {
                ds.insertSongToRoom(
                    roomIdentifier,
                    songId,
                    messageText,
                    videoType,
                    senderID,
                    videoUrlPlay
                );
            }
        }
    }).catch(err => {

    });
    // ds.getNumberOfSong("room_songs", function(data) {
    //     if (data[0].number_room_songs > 10) {
    //         sendMessage.sendTextMessage(senderID, "Full Queue mất tiu òi");
    //         return;
    //     } else {
    //         if (videoType === "youtube") {
    //             ds.insertSongToRoom(roomIdentifier, songId, messageText, videoType, senderID);
    //         } else {
    //             ds.insertSongToRoom(
    //                 roomIdentifier,
    //                 songId,
    //                 messageText,
    //                 videoType,
    //                 senderID,
    //                 videoUrlPlay
    //             );
    //         }
    //     }
    // });
}

function emitMessageVideo(
    socketClient,
    songId,
    videoId,
    videoType,
    videoUrlPlay,
    messageText,
    senderID,
    roomName
) {
    console.log("room cleint",socketClient);
    ds.countIfIsThereAnySong(roomName, function(data) {
        if (data.length > 0) {
            console.log("2");
            insertSongToDatabaseHandler(
                roomName,
                messageText,
                songId,
                videoType,
                senderID,
                videoUrlPlay
            );
        } else {
            console.log("1");
            insertSongToDatabaseHandler(
                roomName,
                messageText,
                songId,
                videoType,
                senderID,
                videoUrlPlay
            );

            if (socketClient != null) {
                let videoObj = {
                    song_id: songId,
                    song_type: videoType,
                    song_url_play: videoUrlPlay,
                    song_video_id: videoId
                };

                socketClient.emit("songs", { msg: videoObj });
            }
        }
    });
}

var nhaccuatuiMusicHandle = (messageText,songId,senderID,first_name,socketClient) =>{
    let nhacCuaTuiUrl = checkNhacCuaTuiUrl(messageText);
    if (nhacCuaTuiUrl) {
        songId = "NHACCUATUI" + makeid();
        getInfoForUrl.getHTMLContentForNhacCuaTui(nhacCuaTuiUrl, function(data) {
            request.get(data, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    parseString(body, function(err, result) {
                        if (result.tracklist.track.length > 0) {
                            let track = result.tracklist.track[0];
                            let link = track.location[0];
                            emitMessageVideo(
                                socketClient,
                                songId,
                                messageText,
                                "nhaccuatui",
                                link.trim(),
                                messageText,
                                senderID,
                                userSelectedRoom[""+senderID]
                            );
                            sendMessage.sendTextMessage(
                                senderID,
                                "Ô kê quẩy luôn " + first_name + "!!"
                            );
                        }else{
                            return false;
                        }
                    });
                }else{
                    return false;
                }
            });
        });
    }else{
        return false;
    }
}

var zingMp3MusicHandle = (messageText,songId,senderID,first_name,socketClient) => {
    let mp3SongId = getInfoForUrl.getMP3VideoId(messageText);
    if (mp3SongId) {
        //opn(messageText, "music");
        songId = "MP3" + makeid();
        let urlReqAPI = API_ZING_MP3_GETLINK_URL + '{"id":"' + mp3SongId + '"}';
            request.get(urlReqAPI, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    let jsonObj = JSON.parse(body);

                    emitMessageVideo(
                        socketClient,
                        songId,
                        messageText,
                        "zing",
                        jsonObj.source["128"],
                        messageText,
                        senderID,
                        userSelectedRoom[""+senderID]
                    );

                    sendMessage.sendTextMessage(
                        senderID,
                        "Ô kê quẩy luôn " + first_name + "!!"
                    );
                }
            });
    }else {
        return false;
    }
}

var youtubeVideoHandle = (messageText,songId,senderID,first_name,socketClient) => {
    let videoId = getInfoForUrl.getYoutubeVideoId(messageText);
    if (videoId) {
        // , "music"
        songId = "YOUTUBE" + makeid();
        emitMessageVideo(
            socketClient,
            songId,
            videoId,
            "youtube",
            "",
            messageText,
            senderID,
            userSelectedRoom[""+senderID]
        );

        sendMessage.sendTextMessage(
            senderID,
            "Ô kê quẩy lên " + first_name + "!!"
        );
    }else{
        return false;
    }

}
var noCommandFound = true;
var musicControlCommandHandle = (messageText,senderID,socketClient) =>{
    
    if (messageText.includes("skip this song")) {
        // if (socketClient != null) {
        //   //  console.log("skip this song", socketClient.roomIdentifier);
        //     socketClient.emit("skip", {});
        // }
        noCommandFound = false;
        ds.deleteSongWhenFinishPlaying(userSelectedRoom[""+senderID],"room_songs",function(result){
            ds.countIfIsThereAnySong(userSelectedRoom[""+senderID],function(data){
                    if(data.length > 0){
                        let roomSongs = data[0].room_songs[0];
                        let videoObj;
                        if(roomSongs.song_type === 'youtube'){
                            let videoId = getInfoForUrl.getYoutubeVideoId(roomSongs.song_name);
                            
                            if(videoId){
                                videoObj =  { "song_id": roomSongs.song_id , "song_type" : roomSongs.song_type, "song_url_play": roomSongs.song_url_play , "song_video_id" : videoId  }; 
                                socketClient.emit("songs",{ msg: videoObj});
                            }
                        }else{
                            
                            videoObj =  { "song_id": roomSongs.song_id , "song_type" : roomSongs.song_type, "song_url_play": roomSongs.song_url_play}; 
                        
                            socketClient.emit("songs",{ msg: videoObj});
                        }   
                        
                    } else { 
                        
                    }
            });
        }); 
        return;
    }
    if (messageText.includes("current song")) {
        ds.findSongPlaying(userSelectedRoom[""+senderID],function(data) {
            sendMessage.sendTextMessage(
                senderID,
                "Bài đang phát là : " + data[0].room_songs[0].song_name
            );
            noCommandFound = false;
        });
        return;
    }
    if(messageText.includes("time now")){
        
        ds.findTimePlayingNow(userSelectedRoom[""+senderID]).then(data=>{
            sendMessage.sendTextMessage(senderID,"Thời gian đang phát hiện tại là " + data[0].currentPlaying.playingTime);
            noCommandFound = false;
            return;
        });
    }
    if (
        messageText.includes("mute") ||
        messageText.includes("nín") ||
        messageText.includes("câm")
    ) {
        if (socketClient != null) {
            socketClient.emit("mute", {});
            noCommandFound = false;
        }
        return;
    }
    if (messageText.includes("unmute") || messageText.includes("giải câm")) {
        if (socketClient != null) {
            socketClient.emit("unmutete", {});
            noCommandFound = false;
        }
        return;
    }
    if (messageText.includes("dừng") || messageText.includes("pause")) {
        if (socketClient != null) {
            socketClient.emit("pause", {});
            noCommandFound = false;
        }
        return;
    }
    if (messageText.includes("stop")) {
        if (socketClient != null) {
            socketClient.emit("stop", {});
            noCommandFound = false;
        }
        return;
    }
    if (messageText.includes("resume")) {
        if (socketClient != null) {
            socketClient.emit("resume", {});
            noCommandFound = false;
        }
        return;
    }
    if (messageText.includes("set volume")) {
        let arrayMessage = new Array();
        arrayMessage = messageText.split(" ");
        let volumeNumber = parseInt(arrayMessage[2]);
        if (socketClient != null) {
            socketClient.emit("setVolume", { volumeOption: volumeNumber });
        }
        noCommandFound = false;
        return;
    }
    if(noCommandFound === true){
        sendMessage.sendTextMessage(senderID,"Sai cú pháp rồi !!!!");
        return;
    }
}


module.exports = {
    receivedMessage: function(event, io) {
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


        if (!userState["" + senderID]) {
            userState["" + senderID] = { currentState: BEGIN };
        }

        const state = userState["" + senderID];

        switch (state.currentState) {
            case BEGIN:
                if(messageText.includes("Use skylab music")){
                      userState[""+senderID] = {currentState :PRE_SELECT_ROOM};
                      sendMessage.sendTextMessage(senderID,"skylab music đã chấp nhận lời yêu cầu của bạn !");
                      userState[""+ senderID] = { currentState: SELECT_ROOM};
                      sendMessage.sendQuickReplyMessageForRoomList(senderID);
                }else sendMessage.sendTextMessage(senderID,"Chào mừng bạn đến với skylab music chat bot , ... getting started ... (Nhập 'Use skylab music' )");
                break;   
            // case PRE_SELECT_ROOM:
                 
            //      if(messageText.includes("OK")){
                         
            //      }else if(messageText.includes("CREATE ROOM")){
            //             userState[""+senderID] = {currentState : CREATE_ROOM};
            //             sendMessage.sendTextMessage(senderID,"Bạn đã chọn tính năng tạo phòng !");
            //      }else  sendMessage.sendTextMessage(senderID,"Hiện tại bạn chưa có phòng để điều khiển , bạn muốn chọn phòng chứ ? ( Nhập 'OK' )");
            //     break;
            case CREATE_ROOM:
                let patt = /CREATE ROOM ([0-9a-zA-Z]+)/i;
                if(patt.exec(messageText) != null){
                    let roomCreateName = patt.exec(messageText)[1];
                    userState[""+senderID] = {currentState : INPUT_PASSWORD_FOR_ROOM};
                    userCreatedRoom[""+senderID] = roomCreateName;
                    sendMessage.sendTextMessage(senderID,"OK , nhập tiếp password cho room nhé");
                }else sendMessage.sendTextMessage(senderID,"Lệnh tạo room không hợp lệ 'CREATE ROOM {tên room}'");
                // if(messageText.match("CREATE ROOM ([0-9a-zA-Z]+)")){
                //     let roomName = messageText.replace("CREATE ROOM ","");
                //     console.log("room Name create",roomName);
                // }
                break; 
            case INPUT_PASSWORD_FOR_ROOM:
                if(messageText){
                        ds.getListRoomInDB((result)=>{
                            let hadRoom = false;
                            for(var r of result){
                                if(userCreatedRoom[""+senderID] === r.room_identifier){
                                            hadRoom = true;
                                }
                            }
                            if(hadRoom) {
                                sendMessage.sendTextMessage(senderID,"Room nay da ton tai");
                            }else {
                                let dataRoom = { "roomName" : userCreatedRoom[""+senderID], "roomPassword" : messageText, "userID" : senderID }
                               
                                ds.createMoreRoomPromise(dataRoom).then(result =>{
                                        sendMessage.sendTextMessage(senderID,"Ok tạo room cho bạn rồi đó");  
                                        userState[""+senderID] = {currentState:PRE_SELECT_ROOM};
                                        socketIoManager.startSocketForRoomName(userCreatedRoom[""+senderID]);
                                });
                                
                            } 
                        });
                }
                break;
            case SELECT_ROOM:

                if (messageText.includes("JOIN ROOM ")) {
                                let roomName = messageText.replace("JOIN ROOM ", "");
                                let choosedRoom = false;
                                if(roomName){
                                    ds.getListRoomInDB((result)=>{
                                        for(var r of result){
                                            if(roomName === r.room_identifier){
                                                     userSelectedRoom["" + senderID] = roomName;
                                                     userState["" + senderID] = {currentState:CHECK_PASSWORD};
                                                     choosedRoom = true;
                                            }
                                        }
                                        if(!choosedRoom) {
                                            sendMessage.sendTextMessage(senderID,"Room không hợp lệ");
                                        }else sendMessage.sendTextMessage(senderID,"Nhập mật khẩu phòng nha");   
                                    });
                                }
                }else sendMessage.sendTextMessage(senderID,"Xin hãy chọn phòng ( bằng cú pháp 'JOIN ROOM {tên phòng}')");
                break;
            case CHECK_PASSWORD:
               // sendMessage.sendTextMessage(senderID, "Nhập mật khẩu của phòng !");
                if(messageText){
                    let data = {"roomIdentifier" : userSelectedRoom[""+senderID] ,"roomPassword" : messageText};
                    ds.authenticateRoomNameAndPassword(data,(result)=>{
                            if(result.length > 0){
                                userState[""+senderID] = {currentState:READY};
                                sendMessage.sendTextMessage(senderID,"OK , đúng mật khẩu dòi , gửi link youtube , mp3 , nhaccuatui để quẩy nhen ^^!")
                            }else sendMessage.sendTextMessage(senderID,"Sai mật khẩu phòng");
                    });
                }
                break;
            case READY:
                getInfoForUrl.getFbName(senderID)
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

                                    let socketClient = io.of("/" + userSelectedRoom[""+senderID]);
                                    if(!socketClient){
                                        console.log("No router connection socket");
                                        return;
                                    }
                                    let songId;
                                    
                                    let commandYes = true;
                                         new Promise((resolve,reject)=>{
                                                
                                                if(youtubeVideoHandle(messageText,songId,senderID,first_name,socketClient)){
                                                    commandYes = false;
                                                    resolve(commandYes);
                                                }
                                                if(zingMp3MusicHandle(messageText,songId,senderID,first_name,socketClient)){
                                                    commandYes = false;
                                                    resolve(commandYes);
                                                }
                                                if(nhaccuatuiMusicHandle(messageText,songId,senderID,first_name,socketClient)){
                                                    commandYes = false;
                                                    resolve(commandYes);
                                                }else {
                                                    resolve(commandYes);
                                                }
                                         }).then(data=>{
                                             if(commandYes) musicControlCommandHandle(messageText,senderID,socketClient);
                                         }).catch(err =>{
                                             console.log("request err",err);
                                         });
                                                                         

                                    //Default text
                                    // switch (messageText) {
                                    //     case "generic":
                                    //         sendMessage.sendGenericMessage(senderID);
                                    //         break;
                                    //     case "volume":
                                    //         sendMessage.sendQuickReplyMessage(senderID);
                                    //         break;
                                    //     default:
                                    //         sendMessage.sendTextMessage(
                                    //             senderID,
                                    //             "Hong phải link youtube/zing mp3 ahihi " +
                                    //                 first_name +
                                    //                 " ngốc!"
                                    //         );
                                    //         break;
                                    // }
                                    // khi song finish -> emit xem coi con` co' song nao` ko => neu ko thi`im , neu co tiep tuc. play
                                    // khi lan` dau` phat' thi` nhan. dc link se~ cho client biet la` co song de? phat'
                                    // speaker chcek coi nhac co' dang phat' k , neu ko thi` play , ko thi` ko lam` gi` ca

                                    //Check & open zing mp3 link
                           
                        } else if (messageAttachments) {
                            // sendTextMessage(senderID, "Message with attachment received");
                        }
                    }).catch(err => console.log(err));
                break;
            
        }
    },
    receivedPostback: function(event) {
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
};

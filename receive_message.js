const request = require("request");
const sendMessage = require("./send_message.js");
const getInfoForUrl = require("./get_information_utils.js");
const API_ZING_MP3_GETLINK_URL = "http://api.mp3.zing.vn/api/mobile/song/getsonginfo?requestdata=";
const parseString = require("xml2js").parseString;
const ds = require("./datasource.js");
const socketIoManager = require("./socket_io_manager.js");

const BEGIN = 0;
const SELECT_ROOM = 1;
const CHECK_PASSWORD = 3;
const READY = 100;
// begin ( chat cau dau`) -> chua co room ( SELECT ROOM ) -> nhapp pass word (CHECK PASSWORD) -> vao room thanh` cong (READY)
let stateFlow = 1;

let userSelectedRoom = {  }; // temp
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

function insertSongToDatabaseHandler(
    roomIdentifier,
    messageText,
    songId,
    videoType,
    senderID,
    videoUrlPlay
) {
    ds.getNumberOfSong("room_songs", function(data) {
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
    });
}

function emitMessageVideo(
    socketClient,
    songId,
    videoId,
    videoType,
    videoUrlPlay,
    messageText,
    senderID
) {
    console.log(socketClient.roomIdentifier);
    ds.countIfIsThereAnySong(socketClient.roomIdentifier, function(data) {
        if (data.length > 0) {
            console.log("2");
            insertSongToDatabaseHandler(
                socketClient.roomIdentifier,
                messageText,
                songId,
                videoType,
                senderID,
                videoUrlPlay
            );
        } else {
            console.log("1");
            insertSongToDatabaseHandler(
                socketClient.roomIdentifier,
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

module.exports = {
    receivedMessage: function(event, io) {
        var senderID = event.sender.id;
        var recipientID = event.recipient.id;
        var timeOfMessage = event.timestamp;
        var message = event.message;

        if (!userSelectedRoom["" + senderID]) {
            userSelectedRoom["" + senderID] = { currentState: BEGIN };
        }

        const state = userSelectedRoom["" + senderID];

        switch (state.currentState) {
            case BEGIN:
                break;
        }

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

                    //check if user has room ?
                    ds.findPersonInRoom(senderID, result => {
                        // socketIoManager.userRoom
                        if (result.length > 0) {
                            let socketClient = io.of("/" + result[0].room_identifier);
                            var songId;
                            var videoId = get.getYoutubeVideoId(messageText);
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
                                    senderID
                                );

                                sendMessage.sendTextMessage(
                                    senderID,
                                    "Ô kê quẩy lên " + first_name + "!!"
                                );
                                return;
                            }

                            // khi song finish -> emit xem coi con` co' song nao` ko => neu ko thi`im , neu co tiep tuc. play
                            // khi lan` dau` phat' thi` nhan. dc link se~ cho client biet la` co song de? phat'
                            // speaker chcek coi nhac co' dang phat' k , neu ko thi` play , ko thi` ko lam` gi` ca

                            //Check & open zing mp3 link
                            if (messageText.includes("mp3.zing.vn")) {
                                //opn(messageText, "music");
                                songId = "MP3" + makeid();
                                get.getMP3VideoId(messageText, function(data) {
                                    let urlReqAPI =
                                        API_ZING_MP3_GETLINK_URL + '{"id":"' + data + '"}';
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
                                                senderID
                                            );

                                            sendMessage.sendTextMessage(
                                                senderID,
                                                "Ô kê quẩy luôn " + first_name + "!!"
                                            );
                                        }
                                    });
                                });

                                return;
                            }

                            if (messageText.includes("nhaccuatui.com")) {
                                songId = "NHACCUATUI" + makeid();
                                get.getHTMLContentForNhacCuaTui(messageText, function(data) {
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
                                                        senderID
                                                    );
                                                    sendMessage.sendTextMessage(
                                                        senderID,
                                                        "Ô kê quẩy luôn " + first_name + "!!"
                                                    );
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

                            if (messageText.includes("skip this song")) {
                                if (socketClient != null) {
                                    console.log("skip this song", socketClient.roomIdentifier);
                                    socketClient.emit("skip", {});
                                }
                                return;
                            }
                            if (messageText.includes("current song")) {
                                ds.findSongPlaying(function(data) {
                                    sendMessage.sendTextMessage(
                                        senderID,
                                        "Bài đang phát là : " + data[0].room_songs[0].song_name
                                    );
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
                                return;
                            }

                            if (messageText.includes("unmute")) {
                                if (socketClient != null) {
                                    socketClient.emit("unmute", {});
                                }
                                return;
                            }

                            if (messageText.includes("dừng") || messageText.includes("pause")) {
                                if (socketClient != null) {
                                    socketClient.emit("pause", {});
                                }
                                return;
                            }

                            if (messageText.includes("stop")) {
                                if (socketClient != null) {
                                    socketClient.emit("stop", {});
                                }
                                return;
                            }

                            if (messageText.includes("resume")) {
                                if (socketClient != null) {
                                    socketClient.emit("resume", {});
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
                                return;
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
                                        "Hong phải link youtube/zing mp3 ahihi " +
                                            first_name +
                                            " ngốc!"
                                    );
                                    break;
                            }
                        } else {
                            if (messageText === "OK") {
                                sendMessage.sendQuickReplyMessageForRoomList(senderID);
                                return;
                            } else if (messageText.includes("JOIN ROOM ")) {
                                sendMessage.sendTextMessage(senderID, "Nhập mật khẩu của phòng !");

                                let roomName = messageText.replace("JOIN ROOM ", "");
                                userSelectedRoom["" + senderID] = roomName;
                            } else if (messageText.includes("pass:")) {
                                let roomName = userSelectedRoom["" + senderID]
                                    ? userSelectedRoom["" + senderID]
                                    : "skylab";

                                ds.insertUserToRoom(roomName, senderID, numAffected => {
                                    if (numAffected) {
                                        sendMessage.sendTextMessage(senderID, "Ok bạn đã vào phòng");
                                        return;
                                    }
                                });
                            } else {
                                sendMessage.sendTextMessage(
                                    senderID,
                                    "Hiện tại bạn chưa có phòng để điều khiển , bạn muốn chọn phòng chứ ? Hay tạo phòng"
                                );
                                return;
                            }
                        }
                    });
                } else if (messageAttachments) {
                    // sendTextMessage(senderID, "Message with attachment received");
                }
            })
            .catch(err => console.log(err));
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

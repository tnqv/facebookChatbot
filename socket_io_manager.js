const ds = require("./datasource.js");
const get = require("./get_information_utils.js");
let io = null;

let userRoom =  {}; // { userID : 'roomID' }

var finishSongFunc = (data,roomClient) => {
    console.log(roomClient.roomIdentifier);
        ds.deleteSongWhenFinishPlaying(roomClient.roomIdentifier,"room_songs",function(result){
                        ds.countIfIsThereAnySong(roomClient.roomIdentifier,function(data){
                                if(data.length > 0){
                                    let roomSongs = data[0].room_songs[0];
                                    let videoObj;
                                    if(roomSongs.song_type === 'youtube'){
                                        let videoId = get.getYoutubeVideoId(roomSongs.song_name);
                                        
                                        if(videoId){
                                            videoObj =  { "song_id": roomSongs.song_id , "song_type" : roomSongs.song_type, "song_url_play": roomSongs.song_url_play , "song_video_id" : videoId  }; 
                                            roomClient.emit("songs",{ msg: videoObj});
                                        }
                                    }else{
                                        
                                         videoObj =  { "song_id": roomSongs.song_id , "song_type" : roomSongs.song_type, "song_url_play": roomSongs.song_url_play}; 
                                     
                                        roomClient.emit("songs",{ msg: videoObj});
                                    }   
                                    
                                } else { 
                                    
                                }
                    });
                }); 
    
}

const checkAuthRoomNameAndPassword = (data,callback) => {
        ds.authenticateRoomNameAndPassword(data,(result)=>{
            if(result.length > 0){
                     callback(false,true);
                }else{
                     callback(true,false);
            }
        });
}
const checkSpeakerIsAlreadyHad = (data,callback) =>{
    
}
const onConnection = (room) =>{

            room.on("songPlayingTime",function(data){        
                   ds.updateTimeWhileSongPlaying(room.roomIdentifier,data.msg);
             });

            room.on("songStart",function(data){
                console.log(data.msg);
                    ds.updateCurrentPlayingSong(room.roomIdentifier,data.msg);
            });
            room.on("finishSong",function (data) {
                    console.log("get finishSong");
                    finishSongFunc(data,room);
            });
}

module.exports = {
    startSocketForRoomName : (roomIdentifier) =>{
            console.log("Start socket for room",roomIdentifier);
            let room = io.of('/' + roomIdentifier);
            //addSocketToMap(roomIdentifier,room);
            //room.roomIdentifier = roomIdentifier;
            room.on('connection',function(socket){
                console.log("Client connected to ",roomIdentifier);
                socket.auth = false;
                socket.on('authenticate',function(data){
                        console.log("data from client",data);
                        checkAuthRoomNameAndPassword(data, function(err, success){
                            if (!err && success){
                                console.log("Authenticated socket ", socket.id);
                                socket.auth = true;
                                socket.roomIdentifier = roomIdentifier;             
                                socket.emit('messages',{msg:'joined room'});
                               
                            }
                        });
                });
                setTimeout(function(){
                    //If the socket didn't authenticate, disconnect it
                    if (!socket.auth) {
                        console.log("Disconnecting socket ", socket.id);
                        socket.disconnect('unauthorized');
                    }
                }, 3000);
                onConnection(socket);
                
            });
    },
    startSocketForAllRooms : (socketIO) => {
       io = socketIO;
       ds.getListRoomInDB((result)=>{
            for (var r of result) {
                    module.exports.startSocketForRoomName(r.room_identifier);
            }
           
       });
        
    }
}
exports.userRoom = userRoom;

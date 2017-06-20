const ds = require("./datasource.js");
const get = require("./get_information_utils.js");
let io = null;

//var mapSocket = {};
let userRoom =  {}; // { userID : 'roomID' }
// let roomsIO = [];

function addSocketToMap(key, value) {
    //if the list is already created for the "key", then uses it
    //else creates new list for the "key" to store multiple values in it.
    mapSocket[key] = mapSocket[key] || [];
    mapSocket[key].push(value);
}

var finishSongFunc = (data,roomClient) => {
        ds.deleteSongWhenFinishPlaying(roomClient.roomIdentifier,"room_songs",function(result){
                console.log("delete result",result);
                        ds.countIfIsThereAnySong(roomClient.roomIdentifier,function(data){
                            console.log("count",data);
                            console.log("count ten room",roomClient.roomIdentifier);
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

 const startSocketForRoomName = (roomIdentifier) =>{
            let room = io.of('/' + roomIdentifier);
           
            //addSocketToMap(roomIdentifier,room);
            room.roomIdentifier = roomIdentifier;
            room.on('connection',function(socket){
                console.log("Client connected to ",roomIdentifier);
                room.emit('messages',{msg:'joined room'});   
                socket.roomIdentifier = roomIdentifier;
                onConnection(socket); 
                       
            });
           // roomsIO.push(room);
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
    getSocketClient : function(io,callback){
        if(io != null){
            io.on("connection", function(client) {  
                    console.log("Client connected...");

                    client.emit("messages", { msg: "Hello from server" });

                    client.on("join", function(data) {
                        console.log(data);
                    });   

                   
                    callback(client);
            });
        }
    },
   startSocketForAllRooms : (socketIO) => {
       io = socketIO;
       ds.getListRoomInDB((result)=>{
            for (var r of result) {
                    console.log("Start socket for room",r.room_identifier);
                    startSocketForRoomName(r.room_identifier);
            }
           
       });
        
    }
}
 exports.userRoom = userRoom; 


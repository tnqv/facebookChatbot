const ds = require("./datasource.js");
const get = require("./get_information_utils.js");

var finishSongFunc = function finishSongHandler(data,client){
     console.log(data);
    ds.deleteSongWhenFinish(function(result){
            ds.countIfIsThereAnySong(function(data){
                    console.log(data);
                    if(data.length > 0){
                        let roomSongs = data[0].room_songs[0];
                        if(roomSongs.song_type === 'youtube'){
                            let videoId = get.getYoutubeVideoId(roomSongs.song_name);
                            if(videoId){
                                client.emit("songs",{ msg: videoId, videoType: "youtube" });
                            }
                        
                        }else{
                            let videoTypeFromDB;
                            if(roomSongs.song_type === "zing"){
                                videoTypeFromDB = "zing";
                            }else{
                                videoTypeFromDB = "nhaccuatui";  
                            }
                            client.emit("songs",{ msg: roomSongs.song_url_play, videoType: videoTypeFromDB });
                        }   
                        
                    } else { 
                        
                    }
         });
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
        
                    client.on("finishSong",function (data) {
                            finishSongFunc(data,client);
                    });

                    

                    callback(client);
            });
        }
    }
}
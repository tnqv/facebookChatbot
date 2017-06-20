
const mongodb = require("mongodb");
const mongodbUrl = process.env.MONGOLAB_URI;

var MongoClient = mongodb.MongoClient;
function connectToDatabase(callback){
     MongoClient.connect(mongodbUrl, (err, db) => {
            if(err){
                console.log(err);
                return;
            }
            callback(db);
     });
}



module.exports = {
    insertUserToRoom : function(roomIdentifier,userId,callback){
            connectToDatabase(function(db){
                    db.collection("room").update({"room_identifier":roomIdentifier},{"$push":{"user_in_room":{"$each":[ userId ]}}},function(error,numAffected){
                            if(error){
                                console.log("InsertSong_error : ",err);
                                db.close(); 
                                return;
                            }

                                console.log("update user to room successful",numAffected.result);
                                callback(numAffected);
                                db.close(); 
                            });
            });
    },
    insertSongToRoom : function(roomIdentifier,songId,songUrl,songType,userReq,urlPlaySong){
          connectToDatabase(function(db){
                db.collection("room").update({"room_identifier" : roomIdentifier},{"$push": {"room_songs": { "$each": [ { "song_id" : songId ,"song_name" : songUrl, "song_type" : songType , "user_request" : userReq , "song_url_play" : urlPlaySong  }] } }},function(err,numAffected){
                    if(err){
                        console.log("InsertSong_error : ",err);
                         db.close(); 
                        return;
                    }
                        console.log("update successful",numAffected.result);
                         db.close(); 
                });
                
          });
         
    },
    updateCurrentPlayingSong : function(roomIdentifier,playingSong){
        console.log("playing song ne",playingSong);
        connectToDatabase(function(db){
                db.collection("room").update({"room_identifier": roomIdentifier},{"$set": {"currentPlaying":{ "playingID":playingSong.playingID ,"playingTime":playingSong.playingTime }}},function(err,numAffected){
                        if(err){
                            console.log("update current playing song : ",err);
                            db.close();
                            return;
                        }
                        console.log("update current song successful",numAffected.result);
                        db.close();
                });
        });
    },
    updateTimeWhileSongPlaying : function(roomIdentifier,playingTime){
        connectToDatabase(function(db){
                db.collection("room").update({"room_identifier":roomIdentifier},{"$set":{"currentPlaying.playingTime": playingTime}},function(err,numAffected){
                        if(err){
                            console.log("update time for current song :",err);
                            db.close();
                            return;
                        }
                        console.log("update time successfully ",numAffected.result);
                        db.close();
                });
        });
    },
    deleteSongWhenFinishPlaying : function(roomIdentifier,songPlayingType,callback){
        console.log(songPlayingType);
        connectToDatabase(function(db){
            db.collection("room").update({"room_identifier" : roomIdentifier},{"$pop":{ "room_songs" : -1}},function(err,numAffected){
                if(err){
                    console.log("Error db when delete songs",err);
                     db.close(); 
                    return;
                }
                console.log("delete songs successful");
               db.close(); 
               callback(numAffected);
            });
        });
    },
    moveToPlayedSong : function(roomIdentifier,callback){
        connectToDatabase(function(db){
            db.collection("room").find({},{"room_identifier": roomIdentifier,'room_songs':{$slice:1}},{'room_songs':1}).toArray(function(err,results){
               if(err){
                    console.log("Error db when finding",err);
                    db.close();
                    return;
                }
                let data = results[0].room_songs[0];
                db.collection("room").update({"room_identifier" : roomIdentifier},{"$push": {"room_songs_played": { "$each": [ { "song_name" : data.song_name, "song_type" : data.song_type , "user_request" : data.user_request , "song_url_play" : data.song_url_play  }] } }},function(err,numAffected){
                        if(err){
                            console.log("Error db when inserting",err);
                            db.close();
                            return;
                        }
                        db.close();
                        callback(numAffected.result);
                });
                
            });
        });
    }, //redux,flux
    findSongPlaying: function(roomIdentifier,callback){
        connectToDatabase(function(db){
            db.collection('room').find({},{'room_identifier':roomIdentifier,'room_songs':{$slice:1},'room_songs.song_name':1}).toArray(function(err,results){
                if(err){
                    console.log("Error db when finding",err);
                    db.close();
                    return;
                }
                callback(results);
                db.close();
            });
        });
    },
    countIfIsThereAnySong: function(roomIdentifier,callback){
        connectToDatabase(function(db){
            db.collection('room').find({'room_identifier':roomIdentifier,room_songs:{$exists : true},$where:'this.room_songs.length > 0'}).toArray(function(err,results){
                if(err){
                    console.log("Error db when getting count",err);
                    db.close();
                    return;
                }
                
                callback(results);
                db.close();
            });
        });
    },
    getNumberOfSong : function(playlist_type,callback){
        connectToDatabase(function(db){
                db.collection('room').aggregate(
                    [
                        {
                            $project: {
                                number_room_songs: { $size: "$"+playlist_type }
                            }
                        }
                    ]
                ,function(err,result){
                    if(err){
                        console.log("Error db when getting count",err);
                        db.close();
                        return;
                    }
                    
                    callback(result);
                    db.close();
                });
        });
    },
    getListRoomInDB : function(callback){
        connectToDatabase(function(db){
            db.collection("room").find({},{ fields : ['room_identifier'] } ).toArray((err, docs) => {

                if(err){
                    console.log("error getting room",err);
                    db.close();
                    return;
                }
                console.log(docs);
                callback(docs);
            });
        });
    },
    findPersonInRoom : (userID,callback) => {
        connectToDatabase(function(db){
            db.collection("room").find({user_in_room: {"$in" : [userID]}}).toArray((err,result)=>{
                if(err){
                    console.log("error finding user",err);
                    db.close();
                    return;
                }
                callback(result);
            });
        });
    }

}
  // db.collection("room").count().then(count => {
                //     if (count < 10) {
                //         db.collection("songs").insert({ song_url: songUrl }).then(result => {
                //             db.close();
                //         });
                //     } else db.close();
                // });

const mongodb = require("mongodb");
const mongodbUrl = process.env.MONGOLAB_URI;

var MongoClient = mongodb.MongoClient;
function connectToDatabase(callback){
     MongoClient.connect(mongodbUrl, (err, db) => {
            callback(db);
     });
}

module.exports = {
    insertSongToDatabase : function(songUrl,songType,userReq,urlPlaySong){
         console.log("song url", songUrl);
          connectToDatabase(function(db){
                db.collection("room").update({"room_identifier" : "skylab"},{"$push": { "room_songs": { "$each": [ { "song_name" : songUrl, "song_type" : songType , "user_request" : userReq , "song_url_play" : urlPlaySong  }] } }},function(err,numAffected){
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
    deleteSongWhenFinish : function(){
        connectToDatabase(function(db){
            db.collection("room").update({"room_identifier" : "skylab"},{"$pop":{"room_songs" : -1}},function(err,numAffected){
                if(err){
                    console.log("Error db when delete songs",err);
                     db.close(); 
                    return;
                }
                console.log("delete songs successful");
               db.close(); 
            });
        });
    },
    findSongPlaying: function(callback){
        connectToDatabase(function(db){
            db.collection('room').find({},{'room_identifier':'skylab','room_songs':{$slice:1},'room_songs.song_name':1}).toArray(function(err,results){
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
    countIfIsThereAnySong: function(callback){
        connectToDatabase(function(db){
            db.collection('room').find({'room_identifier':'skylab','room_songs.1':{$exists : true}}).toArray(function(err,results){
                if(err){
                    console.log("Error db when getting count",err);
                    db.close();
                    return;
                }
                callback(results);
                db.close();
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
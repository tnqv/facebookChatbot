const request = require("request");

const devMode = process.env.NODE_ENV;

const token = devMode === 'development' ? process.env.FB_VUCUTE_PAGE_ACCESS_TOKEN : process.env.FB_PAGE_ACCESS_TOKEN;

const API_ZING_MP3_GETLINK_URL = "http://api.mp3.zing.vn/api/mobile/song/getsonginfo?requestdata=";

const parseString = require('xml2js').parseString;

module.exports =  {
    getFbName : function(senderID){
            return new Promise((resolve, reject) => {
            request(
                {
                    url: "https://graph.facebook.com/v2.9/" + senderID,
                    qs: {
                        fields: "first_name",
                        access_token: token
                    },
                    method: "GET"
                },
                function(error, response, body) {
                    if (error) {
                        console.log("Error request name: ", error);
                        reject(error);
                    } else if (response.body.error) {
                        console.log("Error getting fb name: ", response.body.error);
                        reject(response.body.error);
                    } else {
                        body = JSON.parse(body);
                        console.log("Got name: ", body.first_name);
                        resolve(body.first_name);
                    }
                }
            );
        });
    },
    getYoutubeVideoId : function(url){
         var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
         var match = url.match(regExp);
         console.log("url youtube", url);
         return match && match[7].length == 11 ? match[7] : false;
    },
    getMP3VideoId : function(url,callback){
        try {
            let splitStrArrFromUrl = url.split("/");
            let secondSplit = splitStrArrFromUrl[5].split(".");
            console.log("url Zing", url);
            callback(secondSplit[0] && secondSplit[0].length == 8 ? secondSplit[0] : false);
        }
        catch(err){
            callback(err);
        }
    }, 
    getHTMLContentForNhacCuaTui : function(url,cb){
        request.get(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var csv = body;
                // Continue with your processing here.
                let splitHTML = csv.split("player.peConfig.xmlURL = ");
                let splitHTMLForXmlPath = splitHTML[1].split('"');
                // co mot. cai' rong^~ o? 0 nen phai lay' 1 nha
                cb(splitHTMLForXmlPath[1]);

                //const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
            // console.log(dom.window.document.querySelector("p").textContent); 
                //const $ = require('jQuery')(window);
                //console.log("jsdom",dom);
            //   test.window.document.addEventListener("DOMContentLoaded", function(event) {
            //   });
            
            }
    });
}


}
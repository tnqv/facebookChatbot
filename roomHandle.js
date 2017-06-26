const ds = require("./datasource.js");

exports.findAllRoom = (req,res)=> {
    ds.getListRoomInDB((result)=>{
            let data = [];
            for(var r of result){
                    // let room_element_response = {
                    //     "room_name" : r.room_identifier
                    // }
                   data.push(r.room_identifier);
            }
            res.send(data);
    });
}   
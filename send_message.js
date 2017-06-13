const request = require("request");

const devMode = process.env.NODE_ENV;

const token = devMode === 'development' ? process.env.FB_VUCUTE_PAGE_ACCESS_TOKEN : process.env.FB_PAGE_ACCESS_TOKEN;

function callSendAPI(messageData) {
    request({
        uri: "https://graph.facebook.com/v2.6/me/messages",
        qs: {
            access_token: token
        },
        method: "POST",
        json: messageData
    },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var recipientId = body.recipient_id;
                var messageId = body.message_id;

                console.log(
                    "Successfully sent generic message with id %s to recipient %s",
                    messageId,
                    recipientId
                );
            } else {
                console.error("Unable to send message.");
                console.error(response);
                console.error(error);
            }
        }
    );
}

module.exports =  {

    sendQuickReplyMessage : function(recipientId,messageText) { 
                var messageData = {
                recipient: {
                    id: recipientId
                },
                message: {
                    text: "Điều chỉnh volume",
                    quick_replies: [
                        {
                            content_type: "text",
                            title: "set volume 30 hộ cái",
                            payload: "volume 30"
                        },
                        {
                            content_type: "text",
                            title: "set volume 50 hộ cái",
                            payload: "volume 50"
                        },
                        {
                            content_type:"text",
                            title:"set volume 70 hộ cái",
                            payload:"volume 70"
                        },
                        {
                            content_type:"text",
                            title:"set volume 100 hộ cái",
                            payload:"volume 100"
                        }

                    ]
                }
            };
            callSendAPI(messageData);
     },

    sendGenericMessage : function(recipientId,messageText) { 
            var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: [{
                            title: "rift",
                            subtitle: "Next-generation virtual reality",
                            item_url: "https://www.oculus.com/en-us/rift/",
                            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
                            buttons: [{
                                type: "web_url",
                                url: "https://www.oculus.com/en-us/rift/",
                                title: "Open Web URL"
                            },
                            {
                                type: "postback",
                                title: "Call Postback",
                                payload: "Payload for first bubble"
                            }
                            ]
                        },
                        {
                            title: "touch",
                            subtitle: "Your Hands, Now in VR",
                            item_url: "https://www.oculus.com/en-us/touch/",
                            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
                            buttons: [{
                                type: "web_url",
                                url: "https://www.oculus.com/en-us/touch/",
                                title: "Open Web URL"
                            },
                            {
                                type: "postback",
                                title: "Call Postback",
                                payload: "Payload for second bubble"
                            }
                            ]
                        }
                        ]
                    }
                }
            }
        };

        callSendAPI(messageData);
    },

    sendTextMessage : function(recipientId,messageText){
                var messageData = {
                recipient: {
                    id: recipientId
                },
                message: {
                    text: messageText
                }
            };

            callSendAPI(messageData);
    }
}
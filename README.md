# HOSTING SkyLabMusicBot #

This instruction will walk you through necessary steps to host the bot from this repository.

### Set up local server ###
* Clone repo to local disk
* Download [heroku](https://devcenter.heroku.com/articles/getting-started-with-nodejs#set-up)
* Login using skylabmembers account
* Go to this [link](https://developers.facebook.com/apps/1439594396111274/messenger/)
(You need to register to be fb dev before continue to the app page)
* In Token Generation section, copy the token for Skylab Music page
* Add an enviroment variable to your local system: FB_PAGE_ACCESS_TOKEN: {token gotten from the link above}
* From the repo folder, run `heroku local web` to start localhost
* Open [http://localhost:5000](http://localhost:5000) to check if the server is running

### Setup ngrok ###

* Install [ngrok](https://ngrok.com/download)
* Run `ngrok http -region ap 5000` to expose localhost to a web domain through port 5000
* The ngrok cmd screen shows the free domain currently using for your localhost

### Connect FB to the bot ###

* Go to this [link](https://developers.facebook.com/apps/1439594396111274/webhooks/) & click Edit Subscription
* Paste the ngrok domain from above to Callback URL box
* Paste my_voice_is_my_password_verify_me in Verify token box
* Click Verify and save

All done!
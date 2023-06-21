const { TwitterApi } = require('twitter-api-v2')
const { Client } = require("twitter-api-sdk");

class TwitterV2BT {
  //Constructor stores this.id with current logged in user id to propagate values required by the user.
  constructor(config){
      this.client = new TwitterApi({
          appKey: config.appKey,
          appSecret: config.appSecret,
          accessToken: config.accessToken,
          accessSecret: config.accessSecret
      });
  }

  // Get current logged in user
  async whoami(){
      return await this.client.v2.me()
      .then((response)=>{
          this.id = response.data.id;
          return response.data;
      })
      .catch((error)=>{
          return error.message;
      });
  };

  // Make a tweet
  async tweet(message){
    if(!message) return 'Enter message to tweet';
        return await this.client.v2.tweet(message)
    .then((response)=>{
        return response
    })
    .catch((error)=>{
		console.log(error);
        return error.message;
    });
  }

  // Make a media tweet using Twitter API v1 & v2
  async tweetMedia(message, mediaPath){
    if(!message) return 'Enter a message.';
    if(!mediaPath) return 'Enter image or video path.';
    return await this.client.v1.uploadMedia(mediaPath)
        .then(async (mediaId)=>{
			console.log('picture uploaded with mediaId:', mediaId);
            return await this.client.v2.tweet({ text: message, media: { media_ids: [mediaId] } })
                .then((response)=>{
                    return response;
                })
                .catch((error)=>{
                    return error;
                });
        })
        .catch((error)=>{
			console.log(error);
            return error.data;
        });
  }

}

module.exports = TwitterV2BT;

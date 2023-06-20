/*
    A simple Twitter bot that posts random images.
    Tutorial: https://botwiki.org/resource/tutorial/random-image-tweet/
*/

const fs = require('fs'),
      path = require('path'),
      Twit = require('twit'),
      config = require(path.join(__dirname, 'config.js'));

/*
    Your config.js file should have the following format:
    const config = {
        consumer_key:         'XXXXX',
        consumer_secret:      'XXXXX',
        access_token:         'XXXXX',
        access_token_secret:  'XXXXX'
    }
    module.exports = config;
    Here's a tutorial on how to get the API keys: https://botwiki.org/resource/tutorial/how-to-create-a-twitter-app/
*/

const T = new Twit(config);

const randomFromArray = (arr) => {
    /* Helper function for picking a random item from an array. */

    return arr[Math.floor(Math.random() * arr.length)];
}

const tweetRandomImage = () => {
    /* First, read the content of the images folder. */

    fs.readdir(__dirname + '/images', (err, files) => {
        if (err){
            console.log('error:', err);
            return;
        } else {
            let images = [];

            files.forEach((f) => {
                images.push(f);
            });

            /* Then pick a random image. */

            console.log('opening an image...');

            const imagePath = path.join(__dirname, '/images/' + randomFromArray(images)),
                  imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

            /* Upload the image to Twitter. */

            console.log('uploading an image...', imagePath);

            T.post('media/upload', { media_data: imageData }, (err, data, response) => {
                if (err){
                    console.log('error:', err);
                } else {
                    /* Add image description. */
                    
                    const image = data;
                    console.log('image uploaded, adding description...');

                    T.post('media/metadata/create', {
                        media_id: image.media_id_string,
                        alt_text: {
                            text: 'Describe the image'
                        }            
                    }, (err, data, response) => {

                        /* And finally, post a tweet with the image. */

                        T.post('statuses/update', {
                            // status: 'Optional tweet text.',
                            media_ids: [image.media_id_string]
                        },
                        (err, data, response) => {
                            if (err){
                                console.log('error:', err);
                            } else {
                                console.log('posted an image!');

                                /*
                                    After successfully tweeting, we can delete the image.
                                    Keep this part commented out if you want to keep the image and reuse it later.
                                */

                                // fs.unlink(imagePath, (err) => {
                                //   if (err){
                                //     console.log('error: unable to delete image ' + imagePath);
                                //   } else {
                                //     console.log('image ' + imagePath + ' was deleted');
                                //   }
                                // });
                            }
                        });
                    });
                }
            });
        }
    });
}

setInterval(() => {
    tweetRandomImage();
}, 10000);
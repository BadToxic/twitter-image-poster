/*
    A simple Twitter bot that posts random images from a folder and moves posted ones to another folder.
	By BadToxic
*/

const fs = require('fs'),
      path = require('path'),
      TwitterV2BT = require(path.join(__dirname, 'twitter-v2-bt.js')),
	  png = require('png-metadata'),
      config = require(path.join(__dirname, 'config.js'));

const T = new TwitterV2BT(config);

const randomFromArray = (arr) => {
    /* Helper function for picking a random item from an array. */

    return arr[Math.floor(Math.random() * arr.length)];
}

const whoami = async () => {
	console.log('Calling whoami');
	const me = await T.whoami();
	console.log(me);
}

const tweetText = async (text) => {
	console.log('Tweeting text');
	const me = await T.tweet(text);
	console.log(me);
}
		
const tweetRandomImage = async () => {
    /* First, read the content of the images folder. */

    fs.readdir(__dirname + '/images', async (err, files) => {
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

            /* Upload the image to Twitter. */
			const imageName = randomFromArray(images);
			const imagePath = path.join(__dirname, '/images/' + imageName);
			
			// load from file
			var s = png.readFileSync(imagePath);
			// split
			var list = png.splitChunk(s);
			console.log(list[1]);
			
			/*try {
				console.log('uploading an image...', imagePath);
				const tweetImage = await T.tweetMedia('Check out my new image! 👀', imagePath)
				console.log(tweetImage);
				const newImagePath = path.join(__dirname, '/images-sent/' + imageName);
				fs.rename(imagePath, newImagePath, () => {
					console.log('Moved ' + imageName + ' to ' + newImagePath);
				});
			} catch (error) {
				console.log(error);
			}*/
        }
    });
}

// Direct calls
// whoami();
// tweetText('Test Tweet');
tweetRandomImage();

/*setInterval(() => {
    tweetRandomImage();
}, config.repeatSeconds * 1000);*/
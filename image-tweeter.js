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

// If the image is a png generated with auto111 it should have some usefull info in the png meta data
const getTags = (imagePath) => {
	try {
		const file = png.readFileSync(imagePath);
		const list = png.splitChunk(file);
		if (list.length < 2) {
			return '';
		}
		let auto111Data = list[1].data;
		if (!auto111Data.startsWith('parameters\x00')) {
			return '';
		}
		
		const sampler = auto111Data.substring(auto111Data.indexOf(", Sampler: ") + 11, auto111Data.indexOf(", CFG scale: "));
		// Find the model the image was generated with (after the model "Lora" or "Version" may come)
		let endOfModel = auto111Data.indexOf(", Lora");
		if (endOfModel < 0) {
			endOfModel = auto111Data.indexOf(", Version");
		}
		const model = auto111Data.substring(auto111Data.indexOf(", Model: ") + 9, endOfModel);
		// Get the whole positive prompt
		auto111Data = auto111Data.substring(11, auto111Data.indexOf("Negative prompt:"));
		// Get all tags from the positive prompt
		const tagList = auto111Data.match(/\B(\#[a-zA-Z0-9]+\b)/g);
		
		// Start with some default tags we always want to add (they will be at the end of the text)
		let tags = ' ' + config.defaultTags + ' #' + model.replace('_', ' ') + ' ' + sampler;
		
		// Then go through all tags we found in the prompt and add them in the front while we have space
		for (let tagIndex = tagList.length - 1; tagIndex >= 0; tagIndex--) {
			const tag = tagList[tagIndex];
			// There are only 280 chars allowed in a Twitter post
			if (tags.length + tag.length >= 280) {
				break;
			}
			tags = tag + ' ' + tags;
		}
		return tags;
	} catch(error) {
		console.log(error);
	}
	return '';
}
		
const tweetRandomImage = async () => {
    // First, read the content of the images folder
    fs.readdir(__dirname + '/images', async (err, files) => {
        if (err){
            console.log('error:', err);
            return;
        } else {
            let images = [];

            files.forEach((f) => {
                images.push(f);
            });

            // Then pick a random image and upload it to Twitter
            console.log('opening an image...');
			const imageName = randomFromArray(images);
			const imagePath = path.join(__dirname, '/images/' + imageName);
			
			// Load from file
			const tags = getTags(imagePath);
			console.log('Tags found: ' + tags);
			
			try {
				console.log('uploading an image...', imagePath);
				const tweetImage = await T.tweetMedia(tags, imagePath)
				console.log(tweetImage);
				const newImagePath = path.join(__dirname, '/images-sent/' + imageName);
				fs.rename(imagePath, newImagePath, () => {
					console.log('Moved ' + imageName + ' to ' + newImagePath);
				});
			} catch (error) {
				console.log(error);
			}
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
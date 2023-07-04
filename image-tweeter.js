/*
    A simple Twitter bot that posts random images from a folder and moves posted ones to another folder.
	By BadToxic
*/

const fs = require('fs'),
      path = require('path'),
      TwitterV2BT = require(path.join(__dirname, 'twitter-v2-bt.js')),
	  png = require('png-metadata'),
      config = require(path.join(__dirname, 'config.js')),
	  cliProgress = require('cli-progress');

const T = new TwitterV2BT(config);

// A map that maps a hash generated from tags in a picture to the tweetID of the post of that picture
let quoteData = {};

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

// String to 53bit hash (https://stackoverflow.com/a/52171480/12805111)
const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for(let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

const saveQuoteData = () => {
    fs.writeFileSync(__dirname + '/quoteData.json', JSON.stringify(quoteData, null, 2) , 'utf-8');
};

const loadQuoteData = () => {
    quoteData = JSON.parse(fs.readFileSync(__dirname + '/quoteData.json', { encoding: 'utf-8', flag: 'r' }));
};

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
		let tagList = auto111Data.match(/\B(\#[a-zA-Z0-9]+\b)/g);
		if (tagList == null) {
			tagList = [];
		}
		
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
		
		// Generate a 53bit hash to be able to find posts to quote
		const tagsHash = cyrb53((config.hashWithTags ? tagList.join('') : '') + (config.hashWithModel ? model : '') + (config.hashWithSampler ? sampler : ''));
		
		return { tags, tagsHash };
	} catch(error) {
		console.log(error);
	}
	return '';
}
		
const tweetRandomImage = async () => {
	const promise = new Promise((resolve, reject) => {
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
				const imageName = randomFromArray(images);
				console.log('Opening image', imageName);
				const imagePath = path.join(__dirname, '/images/' + imageName);
				
				// Load from file
				const { tags, tagsHash } = getTags(imagePath);
				console.log('Tags found: ' + tags + ' with hash: ' + tagsHash);
				
				// Check for old tweets to quote
				let quotedTweetId = null; // eg. '1675632144117379073';
				
				if (config.quote) {
					try {
						loadQuoteData();
						const loadedTweetID = quoteData[tagsHash];
						if (loadedTweetID) {
							quotedTweetId = loadedTweetID;
							console.log('Found a previous tweet to quote with ID ', quotedTweetId);
						}
					} catch (error) {
						// It's OK if there was no file
					}
				}
				
				try {
					console.log('uploading an image...', imagePath);
					const tweetImage = await T.tweetMedia(tags, imagePath, quotedTweetId)
					console.log('Tweet with picture tweeted with response:', tweetImage);
					const newImagePath = path.join(__dirname, '/images-sent/' + imageName);
					fs.rename(imagePath, newImagePath, () => {
						console.log('Moved ' + imageName + ' to ' + newImagePath);
					});
					
					// Store tweet ID to find it later for quoting
					quoteData[tagsHash] = tweetImage.data.id;
					saveQuoteData();
					
					// Like own Tweet - not allowed with the free Tier of the Twitter API
					// await T.likeTweet(tweetImage.data.id);
				} catch (error) {
					console.log(error);
					reject(error);
				}
				
				console.log(new Date().toLocaleString());
				
				resolve();
			}
		});
	});
	
	return promise;
}

// Direct calls
// whoami();
// tweetText('Test Tweet');

if (config.repeat) {
	const waitBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
	let repeatAfter, repeatCounter;
	
	const resetCounter = () => {
		repeatAfter = config.repeatSeconds + Math.floor(Math.random() * config.repeatVariation);
		repeatCounter = repeatAfter; // Will be decreased every second until it reaches 0
	};
	
	const startCounter = () => {
		resetCounter();
		waitBar.start(repeatAfter, 0);
	};

	
	const repeater = async () => {
		
		// Update the current waiting progress
		waitBar.update(repeatAfter - repeatCounter);
		
		if (repeatCounter <= 0) {
			
			waitBar.stop();
			console.log(''); // New Line
			
			await tweetRandomImage();
			
			console.log(''); // New Line
			// Restart the progress bar and counter
			startCounter();
			
		}
		
		repeatCounter -= 1;
		setTimeout(repeater, 1000);
	};
	
	// First post directly without waiting
	tweetRandomImage().then(() => {
		console.log(''); // New Line
		// And after that start the counter progress bar and loop
		startCounter();
		repeater();
	});
	

} else {
	// Only one single call
	tweetRandomImage();
}

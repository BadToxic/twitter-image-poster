/*
    A simple Twitter bot that posts random images from a folder and moves posted ones to another folder.
	By BadToxic
*/

const fs = require('fs'),
	  // upath = require('upath'),
      path = require('path'),
      TwitterV2BT = require(path.join(__dirname, 'twitter-v2-bt.js')),
	  png = require('png-metadata'),
      config = require(path.join(__dirname, 'config.js')),
	  cliProgress = require('cli-progress');

const T = new TwitterV2BT(config);
const postTextFileName = 'post.txt';
const postHashFileName = 'hash.txt';

// A map that maps a hash generated from tags in a picture to the tweetID of the post of that picture
let quoteData = {};

const randomFromArray = (arr) => {
    /* Helper function for picking a random item from an array */
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
	const jsonPath = path.join(__dirname, config.quoteFileName);
    fs.writeFileSync(jsonPath, JSON.stringify(quoteData, null, 2) , 'utf-8');
};

const loadQuoteData = () => {
	const jsonPath = path.join(__dirname, config.quoteFileName);
    quoteData = JSON.parse(fs.readFileSync(jsonPath, { encoding: 'utf-8', flag: 'r' }));
};

// Get all images recursively
const getImagesRecursive = (dir = path.join(__dirname, config.inputDirName), filelist = []) => {
    fs.readdirSync(dir).forEach((file) => {
		const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            filelist = getImagesRecursive(filePath, filelist);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (ext == '.jpg' || ext == '.jpeg' || ext == '.png') {
                filelist.push(filePath);
            }
        }
    });
    return filelist;
};

const getFileSize = (filePath) => {
    return fs.statSync(filePath).size;
};

// If the image is a png generated with auto111 it should have some usefull info in the png meta data
const getTags = (imagePath, useTxt, txtPath, hashPath) => {
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
		let tags = config.defaultTags + ' #' + model.replace('_', ' ') + ' ' + sampler;
		
		// Then go through all tags we found in the prompt and add them in the front while we have space
		for (let tagIndex = tagList.length - 1; tagIndex >= 0; tagIndex--) {
			const tag = tagList[tagIndex];
			// There are only maxPostLength chars allowed in a Twitter post
			if (tags.length + tag.length >= config.maxPostLength) {
				break;
			}
			tags = tag + ' ' + tags;
		}
		
		// Generate a 53bit hash to be able to find posts to quote
		const tagsHash = cyrb53((config.hashWithTags ? tagList.join('') : '') + (config.hashWithModel ? model : '') + (config.hashWithSampler ? sampler : '')) + '';
		
		if (useTxt) {
			console.log('Saving post text to:', txtPath);
			fs.writeFileSync(txtPath, tags, 'utf-8');
			console.log('Saving hash', tagsHash, 'to:', hashPath);
			fs.writeFileSync(hashPath, tagsHash, 'utf-8');
		}
		
		return { tags, tagsHash };
	} catch(error) {
		console.log(error);
	}
	return '';
}
		
const tweetRandomImage = async () => {
	
	return new Promise(async (resolve, reject) => {
		// Chose a random image in the images folder and its subfolders (.jpg, .jpeg, .png)
		let imagePath;
		let errorOccured = false;
		try {
			imagePath = randomFromArray(getImagesRecursive());
			console.log('Chosen image:', imagePath);
		
			// Check file size
			const fileSize = getFileSize(imagePath);
			if (fileSize > config.maxFileSize) {
				const error = 'Image size of ' + fileSize + ' bytes is bigger than the allowed ' + config.maxFileSize + ' bytes.';
				console.log(error);
				reject(new Error(error));
				errorOccured = true;
			}
		} catch (err){
			console.log('Could not find image:', err);
			reject(err);
			errorOccured = true;
		}
		
		if (!errorOccured) {
			let postTxt, postHash;
			
			// Check if there is already a text file to use
			const imagesDir = path.join(__dirname, config.inputDirName);
			const imageDirPath = path.parse(imagePath).dir;
			// Only use txt files if we are in a sub folder, else we can't know which images the file is for
			const useTxt = config.usePostHashFiles && (imagesDir != imageDirPath);
			let tagsLoaded = false;
			const txtPath = path.join(imageDirPath, postTextFileName);
			const hashPath = path.join(imageDirPath, postHashFileName);
			if (useTxt) {
				console.log('Checking for a post text file and hash file.');
				if (fs.existsSync(txtPath)) {
					postTxt = fs.readFileSync(txtPath, { encoding: 'utf-8', flag: 'r' });
					console.log('Loaded post text from file:', txtPath);
					tagsLoaded = true;
					
					// Also check if there is already a hash file
					if (fs.existsSync(hashPath)) {
						postHash = fs.readFileSync(hashPath, { encoding: 'utf-8', flag: 'r' });
						console.log('Loaded hash from file:', hashPath);
					} else {
						// Else generate a 53bit hash (using the full text) to be able to find posts to quote
						postHash = cyrb53(postTxt) + '';
						fs.writeFileSync(hashPath, postHash, 'utf-8');
						console.log('Created hash of full postTxt:', postHash);
					}
				}
			} else {
				console.log('Image is in root directory. We will ignore post text and hash files.');
			}
			
			// Load tags from image file if no tags were found yet
			if (!tagsLoaded) {
				const { tags, tagsHash } = getTags(imagePath, useTxt, txtPath, hashPath);
				postTxt = tags;
				postHash = tagsHash;
			}
			
			console.log('Post text: ' + postTxt + '\nwith hash: ' + postHash);
			if (postTxt == undefined) {
				reject('Post text could not be set.');
				errorOccured = true;
			} else if (postTxt.length > config.maxPostLength) {
				// Trim post text if needed
				const shortenedBy = postTxt.length - config.maxPostLength + 3;
				postTxt = postTxt.substring(0, config.maxPostLength - 3) + '...';
				console.log('Post text was longer than the allowed', config.maxPostLength,
				            'chars and was trimmed by', shortenedBy, 'chars to:', postTxt);
			}
			if (postHash == undefined) {
				reject('Post hash could not be set.');
				errorOccured = true;
			}
			
			if (!errorOccured) {
				
				// Check for old tweets to quote
				let quotedTweetId = null; // eg. '1675632144117379073';
				
				if (config.quoteOrReply != 'none') {
					try {
						loadQuoteData();
						const loadedTweetID = quoteData[postHash];
						if (loadedTweetID) {
							quotedTweetId = loadedTweetID;
							console.log('Found a previous tweet to quote with ID ', quotedTweetId);
						}
					} catch (error) {
						// It's OK if there was no file
					}
				}
				
				try {
					console.log('Uploading image', imagePath);
					const tweetImage = await T.tweetMedia(postTxt, imagePath, quotedTweetId, config.quoteOrReply);
					// console.log(typeof tweetImage === 'string', tweetImage instanceof String, typeof tweetImage);
					if (tweetImage.error) {
						console.log('Can not tweet: Received error', tweetImage.code, '-', tweetImage.data?.title, '\n');
						// reject(tweetImage);
						throw new Error(tweetImage);
					}
					console.log('Tweeted with picture. Response:', tweetImage);
					
					// Store tweet ID to find it later for quoting or replying.
					// Overwrites the previews id to reference to the latest post / reply instead of the first post.
					if (!quoteData[postHash] || config.updateRefId) {
						quoteData[postHash] = tweetImage.data.id;
						saveQuoteData();
					}
					
					const imageName = path.basename(imagePath);
					const newImagePath = imagePath.replace(path.join(__dirname, config.inputDirName), path.join(__dirname, config.outputDirName));
					const newFolderPath = path.dirname(newImagePath);
					// Create new subfolder(s)
					if (!fs.existsSync(newFolderPath)) {
						fs.mkdirSync(newFolderPath, { recursive: true });
					}
					fs.rename(imagePath, newImagePath, () => {
						console.log('Moved ' + imageName + ' to ' + newImagePath);
						console.log(new Date().toLocaleString());
						resolve();
					});
					
					// Like own Tweet - not allowed with the free Tier of the Twitter API
					// await T.likeTweet(tweetImage.data.id);
				} catch (error) {
					console.log(error);
					reject(error);
				}
			}
		}
	});
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
			
			try {
				await tweetRandomImage();
			} catch (error) {
				console.log('\nStopping program at', new Date().toLocaleString());
				return;
			}
			
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
	}, () => {
		console.log('\nStopping program at', new Date().toLocaleString());
	});

} else {
	// Only one single call
	tweetRandomImage();
}

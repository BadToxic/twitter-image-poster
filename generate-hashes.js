/*
    Little helper tool for generating the post text hashes from a txt file for each subfolder in the images directory.
	By BadToxic
*/

const fs = require('fs'),
	  // upath = require('upath'),
      path = require('path');
      // config = require(path.join(__dirname, 'config.js')),
	  // cliProgress = require('cli-progress');

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

const postTextFileName = 'post.txt';
const postHashFileName = 'hash.txt';

// Get all subfolders of a given directory
const getSubfolders = (dir = path.join(__dirname, 'images'), folderlist = []) => {
    fs.readdirSync(dir).forEach((file) => {
		const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            folderlist.push(filePath);
        }
    });
    return folderlist;
};

const generateHashes = async () => {
	return new Promise(async (resolve, reject) => {
		
		getSubfolders().forEach((dir) => {
			const txtPath = path.join(dir, postTextFileName);
			const hashPath = path.join(dir, postHashFileName);
			console.log('Checking for a post text file and hash file.');
			
			try {
				// Only create if hash file it doesn't exist yet but there is a post text file
				if (!fs.existsSync(hashPath)) {
					if (fs.existsSync(txtPath)) {
						const postTxt = fs.readFileSync(txtPath, { encoding: 'utf-8', flag: 'r' });
						console.log('Loaded post text from file', txtPath, postTxt);
						// Generate a 53bit hash (using the full text) to be able to find posts to quote
						const postHash = cyrb53(postTxt) + '';
						fs.writeFileSync(hashPath, postHash, 'utf-8');
						console.log('Created and saved hash', postHash, 'of full postTxt:', hashPath);
					} else {
						console.log('Skipping - post text file not found:', txtPath);
					}
				} else {
					console.log('Skipping - hash file already exists:', hashPath);
				}
			} catch(error) {
				console.log(error);
			}
		});
	});
}

// Start
generateHashes().then(() => {
	console.log('\nFinished creating all hash files.');
}, () => {
	console.log('\nStopping program at', new Date().toLocaleString());
});

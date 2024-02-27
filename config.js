const config = {
	appKey:           'XXXX',
	appSecret:        'XXXX',
	accessToken:      'XXXX',
	accessSecret:     'XXXX',
	bearerToken:      'XXXX',
	clientID:         'XXXX',
	clientSecret:     'XXXX',
	quoteFileName:    'quoteData.json',
	statsFileName:    'stats.json',
	inputDirName:     'images',
	outputDirName:    'images-sent',
	repeat:           true,
	repeatSeconds:    600,
	repeatVariation:  120,
	defaultTags:      '#Auto1111 #StableDiffusion #safetensors #AIArt #AI #art',
	quoteOrReply:     'both',
	updateRefId:      true,
	hashWithTags:     true,
	hashWithModel:    false,
	hashWithSampler:  false,
	usePostHashFiles: false
	maxPostLength:    280,
	maxFileSize:      5242880
}

module.exports = config;

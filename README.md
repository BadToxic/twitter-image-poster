# twitter-image-poster
Post (random) images on Twitter

Created for postin pictures created with Auto1111 Stable Diffusion AI.
It will automatically use tags (__/\B(\#[a-zA-Z0-9]+\b)/g__) from the positive prompt that is stored in the png meta data of the generated images as text in the twitter post.

## Instructions
1. Set your Twitter API in the config.js (find them on https://developer.twitter.com/en/portal/dashboard).
2. Put your images in the images folder.
3. npm start

## Example

Result of an image that contains the following Meta data:

	octane render \(#octaneRender\), #hdr, (#hyperdetailed:1.15), (soft light\(#softLight\), #sharp:1.2), #beautiful, #realistic, 1 #cute #sexy #hot #jellyfish #girl, #bubbles, #glowing, deep #sea \(#deepSea\), #dark
	Negative prompt: blush,fewer fingers,(low quality, worst quality:1.4), (bad anatomy), (inaccurate limb:1.2),bad composition, inaccurate eyes, extra digit,fewer digits,easynegative,monochrome, zombie,overexposure, watermark,text,bad hand,extra hands,extra fingers,too many fingers,fused fingers,bad arm,distorted arm,extra arms,fused arms,extra legs,missing leg,disembodied leg,extra nipples, detached arm, liquid hand,inverted hand,disembodied limb, oversized head,extra body, extra navel,easynegative,(hair between eyes),sketch, duplicate, ugly, text, logo, worst face, (bad and mutated hands:1.3), (blurry:2.0), geometry, bad_prompt, (bad hands), (missing fingers), multiple limbs, bad anatomy, (interlocked fingers:1.2), Ugly Fingers, (extra digit and hands and fingers and legs and arms:1.4), ((2girl)), (deformed fingers:1.2), (long fingers:1.2),(bad-artist-anime), bad-artist, bad hand, extra legs ,(ng_deepnegative_v1_75t), naked, breasts, nude, nsfw, no clothes
	Steps: 20, Sampler: DPM++ 2M Karras, CFG scale: 7, Seed: 1270640879, Size: 540x960, Model hash: ec6f68ea63, Model: lyriel_v16, Version: v1.3.2


![Example Post](example-post.png)
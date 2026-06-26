export function getSpriteFromName(name) {
    let url = `https://www.smogon.com/forums//media/minisprites/${name.toLowerCase().replace(": ", "-").replace(" ", "-")}.png`
    //console.log(url);
    return url;
}
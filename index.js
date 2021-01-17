const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const config = require('./config');
const { group } = require('console');
const { userInfo } = require('os');
const { stringify } = require('querystring');
const fs = require('fs');
const path = require('path');
const twit = require('twit');
require('dotenv').config()
var redis = require('redis');
var T = new twit({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET
});
function read_data_dir() {
    if (process.env.DATA_DIR) {
        if (process.env.DATA_DIR.endsWith("/")) {
            return process.env.DATA_DIR;
        }
        return process.env.DATA_DIR + "/";
    }
    return "src/"
}
const DATA_DIR = read_data_dir();



//Discord integration start
const PREFIX = "<";
const Dickord = require('discord.js');
const { findSourceMap } = require('module');
const disclient = new Dickord.Client();
require('dotenv').config();
var blockedusers = fs.readFileSync(DATA_DIR + 'blockedusers.txt').toString().split("\n");
function refreshblock(bah) {
    blockedusers = fs.readFileSync(DATA_DIR + 'blockedusers.txt').toString().split("\n");
};
setInterval(refreshblock, 250);


disclient.login(process.env.DISCORDJS_BOT_TOKEN);
disclient.on('ready', () => {
    console.log('Discord logged on');
    disclient.generateInvite({
        permissions: ['SEND_MESSAGES', 'MANAGE_GUILD', 'MENTION_EVERYONE'],
    })
});
disclient.on('message', (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith(PREFIX)) {
        const [CMD_NAME, ...args] = message.content
            .trim()
            .substring(PREFIX.length)
            .split(/\s+/);
        if (CMD_NAME === "guilds" && message.author.id === "162182497336164352") {
            message.channel.send("Currently in " + disclient.guilds.cache.size + " guilds");
        } else if (CMD_NAME === "guilds" && message.author.id !== "162182497336164352") {
            message.channel.send("You do not have permission to use this command!");
        };
        if (CMD_NAME === "testtweet" && message.author.id === "162182497336164352") {
            sendToTwitter("www.google.com");
        } else if (CMD_NAME === "guilds" && message.author.id !== "162182497336164352") {
            message.channel.send("You do not have permission to use this command!");
            return;
        };
        if (CMD_NAME === "testdiscord" && message.author.id === "162182497336164352") {
            sendToDiscord("This is a test message. Ignore it please :)");
        } else if (CMD_NAME === "guilds" && message.author.id !== "162182497336164352") {
            message.channel.send("You do not have permission to use this command!");
            return;
        };
        if (CMD_NAME === "help") {
            message.channel.send("Create a channel called #clamnews so I can post news in there every Sunday! Make sure to give me proper permissions. DM me to send me news you'd like to see in our articles next week! <invite for an invite link, <steamgroup for a steam group link. <twitter for my twitter, where news also get posted!");
        };
        if (CMD_NAME === "author") {
            message.channel.send("This bot was made by Clamor#0068 to automate the process of sending links to his weekly gaming news.");

        };
        if (CMD_NAME === "invite") {
            message.channel.send("https://discord.com/api/oauth2/authorize?client_id=795678709671395368&permissions=141312&scope=bot");

        };
        if (CMD_NAME === "steamgroup") {
            message.channel.send("https://steamcommunity.com/groups/ClamorNews");
        };
        if (CMD_NAME === "twitter") {
            message.channel.send("https://twitter.com/ClammySlammy");
        };
        if (CMD_NAME === "ban" && message.author.id === "162182497336164352") {
            fs.appendFileSync('./src/blockedusers.txt', '\n' + args[0]);
        } else if (CMD_NAME === "ban" && message.author.id !== "162182497336164352") {
            message.channel.send("You do not have permission to use that command!");
            return;
        };
        if (CMD_NAME === "listblocks" && message.author.id === "162182497336164352") {
            for (i in blockedusers) {
                message.channel.send(blockedusers[i]);
            };
        } else if (CMD_NAME === "listblocks" && message.author.id !== "162182497336164352") {
            message.channel.send("You do not have permission to use that command!");
        };
    };
});
function isblocked(obj, list) {
    for (i in list) {
        if (list[i] === obj) {
            return true;
        }

    }
    return false;
}


disclient.on("message", (message) => {
    if (message.channel.type === "dm" && message.author.id !== '795678709671395368' && message.author.id !== '162182497336164352') {
        if (isblocked(message.author.id, blockedusers) === true) {
            message.reply("Sorry,you've been blocked from sending news because you're too naughty.");
            return;
        } else if (message.channel.type === "dm" && message.author.id !== '795678709671395368') {
            //embed
            var exampleEmbed = new Dickord.MessageEmbed()
                .setTitle('DM receieved:')
                .setAuthor(message.author.tag, message.author.avatarURL)
                .setThumbnail(message.author.avatarURL)
                .setDescription(message.content)
                .setTimestamp()
                .setFooter("UserID:" + message.author.id);
            //
            disclient.users.cache.get("162182497336164352").send(exampleEmbed);
            message.reply("Thank you for your gracious donation of News!");
            console.log("Dm Received, rerouted to clamzer");
        };

    };
}
);




//Discord integration end
//Steam integration
const client = new SteamUser();

const logInOptions = {
    accountName: process.env.ACCOUNT_NAME,
    password: process.env.PASSWORD,
};

client.logOn(logInOptions);

client.on('loggedOn', () => {
    console.log('Steam logged on');

    client.setPersona(SteamUser.EPersonaState.Online);
    //Get headline of announcement, keep it in a variable.
    client.on('groupAnnouncement', function (sid, headline, gid) {
        var gamingnews = headline;
        sendToDiscord(gamingnews);
        sendToTwitter(gamingnews);
    });
});
//Steam integration end
function sendToTwitter(link) {
    T.post('statuses/update', { status: `News for this week are up! ${link} #GamingNews` });
};
function sendToDiscord(link) {
    let channels = disclient.channels.cache.filter(ch => ch.name === "clamnews");
    channels.forEach(channel => {
        try{
            channel.send(link)
        } catch(error){
            console.error(error);
            console.log("Error when trying to send message." + ch.guild.id)
            disclient.users.cache.get("162182497336164352").send("A server didn't have permissions set up properly. Server owner:"+message.guild.owner);
            
        };
    });

}
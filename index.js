const { Message } = require('mirai-ts');
const axios = require('axios').default;
const stringRandom = require('string-random');
const NeteaseMusic = require('simple-netease-cloud-music');
const { default: Bot } = require('el-bot');
// const { secFormat } = require('../../utils');
const nm = new NeteaseMusic();

// let uin = 0;

/**
 * 转义
 * @param {String} text 
 */
function htmlEscape(text) {
    return text.replace(/[<>"&]/g, function (match, pos, originalText) {
        switch (match) {
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "&": return "&amp;";
            case "\"": return "&quot;";
        }
    });
}
/**
 * 获取APP内容
 * @param {any} song 
 * @param {string} type 
 */
function getAppContent(song, type = '163') {
    let jumpUrl;
    let musicUrl;
    let preview;
    let songName;
    let appid;
    const tag = type === 'qq' ? 'QQ音乐' : '网易云音乐';
    let ar;
    let xml;
    let icon = '';
    if (type === 'qq') {
        appid = 1101079856;
        jumpUrl = `https://i.y.qq.com/v8/playsong.html?_wv=1&songid=${song.id}&souce=qqshare&source=qqshare&ADTAG=qqshar`;
        musicUrl = song.url;
        preview = `http://y.gtimg.cn/music/photo_new/T002R300x300M000${song.album.pmid}.jpg`;
        songName = song.name.length > 27 ? song.name.substring(0, 27) + '...' : song.name;
        icon = 'https://i.gtimg.cn/open/app_icon/01/07/98/56/1101079856_100_m.png';
        let arArr = [];
        song.singer.forEach((v) => {
            arArr = arArr.concat(v.name);
        });
        const arStr = arArr.join('/');
        ar = arStr.length > 36 ? arStr.substring(0, 36) + '...' : arStr;
    } else {
        appid = 100495085;
        jumpUrl = `https://y.music.163.com/m/song?app_version=7.3.12&id=${song.id}`;
        musicUrl = `http://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
        preview = song.al.picUrl;
        songName = song.name.length > 27 ? song.name.substring(0, 27) + '...' : song.name;
        let arArr = [];
        song.ar.forEach((v) => {
            arArr = arArr.concat(v.name);
        });
        const arStr = arArr.join('/');
        ar = arStr.length > 36 ? arStr.substring(0, 36) + '...' : arStr;
    }

    xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' +
        `<msg serviceID="2" templateID="1" action="web" brief="[分享] ${htmlEscape(songName)}" sourceMsgId="0" url="${htmlEscape(jumpUrl)}" flag="0" adverSign="0" multiMsgFlag="0">` +
        '<item layout="2">' +
        `<audio cover="${htmlEscape(preview)}" src="${htmlEscape(musicUrl)}" />` +
        `<title>${htmlEscape(songName)}</title>` +
        `<summary>${htmlEscape(ar)}</summary>` +
        '</item>' +
        `<source name="${tag}" icon="${icon}" url="http://web.p.qq.com/qqmpmobile/aio/app.html?id=${appid}" action="app" a_actionData="com.tencent.qqmusic" i_actionData="tencent${appid}://" appid="${appid}" />` +
        '</msg>';
    return [Message.Xml(xml), Message.Plain(`[分享]${songName}\n${ar}\n${jumpUrl}\n来自: ${tag}`)];
    // const json = {
    //     app: 'com.tencent.structmsg',
    //     config: {
    //         autosize: true,
    //         // ctime: Math.round(Date.now() / 1000),
    //         forward: true,
    //         token: '',//stringRandom(32, { letters: 'abcdefghljklmnopqrstuvwxyz' }),
    //         type: 'normal'
    //     },
    //     desc: '音乐',
    //     extra: { app_type: 1, appid },
    //     meta: {
    //         music: {
    //             action: '',
    //             android_pkg_name: '',
    //             app_type: 1,
    //             appid,
    //             desc: ar,
    //             jumpUrl,
    //             musicUrl,
    //             preview,
    //             sourceMsgId: '0',
    //             source_icon: '',
    //             source_url: '',
    //             tag,
    //             title: songName
    //         }
    //     },
    //     prompt: `[分享]${songName}`,
    //     ver: '0.0.0.1',
    //     view: 'music'
    // };
    // return [Message.App(JSON.stringify(json)), Message.Plain(`[分享]${songName}\n${ar}\n${jumpUrl}\n来自: ${tag}`)];
}

/**
 * QQ音乐搜索
 * @param {string} keyword 
 */
async function qqMusicSearch(keyword) {
    const { data } = await axios.get(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp?ct=24&qqmusic_ver=1298&new_json=1&remoteplace=txt.yqq.song&searchid=&t=0&aggr=1&cr=1&catZhida=1&lossless=0&flag_qc=0&p=1&n=20&w=${encodeURI(keyword)}`);
    const j = /callback\((.+)\)$/.exec(data)[1];
    return JSON.parse(j);
}

/**
 * 点歌
 * @param {Bot} ctx 
 */
module.exports = async (ctx) => {
    const { mirai, logger } = ctx;
    // uin = ctx.el.qq;
    mirai.on('message', async (msg) => {
        const typeString = msg.plain.split(" ")[0].toLowerCase();
        const keyword = msg.plain.slice(typeString.length).trim();
        if (typeString === '网易点歌' || typeString === '点歌') {
            // if (!checkCoolDown(msg.sender.id, msg.reply)) {
            //     return;
            // }
            if (!keyword) {
                msg.reply('请输入关键词');
                return;
            }
            try {
                const { result } = await nm.search(keyword);
                if (result.songCount === 0) {
                    msg.reply('搜索不到');
                    return;
                }
                const appData = getAppContent(result.songs[0]);
                msg.reply(appData);
                // setCoolDown(msg.sender.id, 10 * 60);
            } catch (e) {
                logger.error(`[music] ${e.message}`);
                msg.reply('失败');
            }
        } else if (typeString === 'qq点歌') {
            // if (!checkCoolDown(msg.sender.id, msg.reply)) {
            //     return;
            // }
            if (!keyword) {
                msg.reply('请输入关键词');
                return;
            }
            try {
                const r = await qqMusicSearch(keyword);
                if (r.data.song.curnum === 0) {
                    msg.reply('搜索不到');
                    return;
                }
                let song = r.data.song.list[0];
                const { data } = await axios.get(`https://api.qq.jsososo.com/song/url?type=320&id=${song.mid}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36'
                    }
                });
                logger.info(`[music] QQ音频地址:${data.data}`);
                song.url = data.data;
                const appData = getAppContent(song, 'qq');
                msg.reply(appData);
                // setCoolDown(msg.sender.id, 10 * 60);
            } catch (e) {
                logger.error(`[music] ${e.message}`);
                msg.reply('失败');
            }
        }
    });
};
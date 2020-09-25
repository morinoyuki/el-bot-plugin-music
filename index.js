const { Message } = require('mirai-ts');
const axios = require('axios').default;
const stringRandom = require('string-random');
const NeteaseMusic = require('simple-netease-cloud-music');
const { default: Bot } = require('el-bot');
const nm = new NeteaseMusic();

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
    const tag = type === 'qq' ? 'QQ音乐' : '网易云音乐'
    let ar = [];
    if (type === 'qq') {
        jumpUrl = `https://i.y.qq.com/v8/playsong.html?_wv=1&songid=${song.id}`;
        musicUrl = song.url;
        preview = `http://y.gtimg.cn/music/photo_new/T002R300x300M000${song.album.pmid}.jpg?max_age=2592000`;
        songName = song.name;
        song.singer.forEach((v) => {
            ar = ar.concat(v.name);
        });
    } else {
        jumpUrl = `http://music.163.com/song/${song.id}/`;
        musicUrl = `http://music.163.com/song/media/outer/url?id=${song.id}`;
        preview = song.al.picUrl;
        songName = song.name;
        song.ar.forEach((v) => {
            ar = ar.concat(v.name);
        });
    }
    const json = {
        app: 'com.tencent.structmsg',
        config: {
            autosize: true,
            ctime: Math.floor(Date.now() / 1000),
            forward: true,
            token: stringRandom(32),
            type: 'normal'
        },
        desc: ' 音乐',
        extra: { app_type: 1, appid: 100495085 },
        meta: {
            music: {
                action: '',
                android_pkg_name: '',
                app_type: 1,
                appid: 100495085,
                desc: ar.join('/'),
                jumpUrl,
                musicUrl,
                preview,
                sourceMsgId: '0',
                source_icon: '',
                source_url: '',
                tag,
                title: songName
            }
        },
        prompt: `[分享]${songName}`,
        ver: '0.0.0.1',
        view: 'music'
    };
    return JSON.stringify(json);
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
    mirai.on('message', async (msg) => {
        const typeString = msg.plain.split(" ")[0].toLowerCase();
        const keyword = msg.plain.slice(typeString.length).trim();
        if (typeString === '网易点歌' || typeString === '点歌') {
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
                msg.reply([Message.App(appData)]);
            } catch (e) {
                logger.error(`[music] ${e.message}`);
                msg.reply('失败');
            }
        } else if (typeString === 'qq点歌') {
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
                msg.reply([Message.App(appData)]);
            } catch (e) {
                logger.error(`[music] ${e.message}`);
                msg.reply('失败');
            }
        }
    });
};
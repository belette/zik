const express = require('express');
const fs = require('fs');
const http = require('http');

const https = require('https');
//  VARIABLES POUR HTTPS
const privateKey = fs.readFileSync('./server.key', 'utf8');
const certificate = fs.readFileSync('./server.cert', 'utf8');
const credentials = { key: privateKey, cert: certificate };


const port_http = 8083;

const path = require('path');
const tool = require('./src/script/tool')
const sqlite3 = require('sqlite3').verbose();
const chalk = require('chalk');
const cookieParser = require("cookie-parser");
const shajs = require('sha.js');
const { resolve } = require('path');
const mainPath = "C:/Users/leudetdelavalleeb/Music/";
const bodyParser = require('body-parser');
const axios = require('axios');

const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const app = express();

app.use(express.static(path.join(__dirname, '/src/public')));
app.use(cookieParser());

app.set('views', path.join(__dirname, '/src/views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// DATABASE  : 
const db = new sqlite3.Database('./db_sqlite.db');

const tag_options = ['TALB', 'TPE1', 'TIT2', 'TIME', 'TDAT', 'TLEN'];

function resetTag() {
    return {
        title: null,
        album: null,
        artist: null,
        time: null,
        date: null,
        length: null
    }
}

function resetDossier() {
    return {
        path: "",
        name: "",
        cover: "",
        nbr_elements: 0,
        parent_id: ""
    }
}

function resetMp3() {
    return {
        path: "",
        name: "",
        extension: "",
        title: "",
        parent_id: "",

        tag_title: "",
        tag_album: "",
        tag_artist: "",
        tag_time: "",
        tag_date: "",
        tag_length: ""
    }
}


const router_repertoire = require('./src/script/routes/repertoire.route')(db);
app.use('/get', router_repertoire);


/**
 * MIDDLEWARE ROOT
 */
app.use((req, res, next) => {
    next();
    return;
});

app.all('/home', (req, res) => {
    res.render('main', { message: null });
});


app.all('/scan', (req, res) => {
    return new Promise((resolve, reject) => {
        // Requete to clean les doublons duplicat : DELETE FROM DOSSIER WHERE rowid NOT IN (SELECT min(rowid) FROM DOSSIER GROUP BY name);

        // var _path = "D:/";
        // var folder_name = "Musique";


        var _path = "D:/";
        var folder_name = "Musique";
        // var _path = mainPath;
        // var folder_name = "sound";
        var rootFolder = resetDossier();
        rootFolder.path = _path;
        rootFolder.name = folder_name;
        rootFolder.id = 0;

        var playlist_id = 'PL-Je9XPLvTKkjsS4tSDFLv-KFdGsalEoo'
        let obj_plylist = {
            title: null,
            owner: null,
            trackCount: null,
            dateYear: null,
            channelId: null,
            content: []
        }


        /* empty_db().then((ok) => {
            record_directory(_path, folder_name, rootFolder).then((result) => {
                console.log("ON commence les souss dossier : .............................")
                complete_sous_dossier().then((result) => {
                    console.log("Terminé ! *****************")
    
                    */

//Partie YOUTUBE
var playlist_id = 'PL-Je9XPLvTKkjsS4tSDFLv-KFdGsalEoo'
        load_yt_api(playlist_id, "Maplayslist", '', obj_plylist).then((objy) => {
            //console.log(objy)
            console.log("##########CES FINIT###########")
            resolve();

        }).catch((err) => {
            console.log(err)
        })

        /*
        
                    }).catch((err) => {
                        console.log(err)
                         resolve(res.json(err));
                    })
                })
            })
        */
    })
});




app.all('/test', (req, res) => {
    return new Promise((resolve, reject) => {
        empty_db().then((resu) => {
            // console.log(resu)
            resolve()
        }).catch((err) => {
            console.log('Erreur', err)
            resolve()
        })
    })
})


async function empty_db() {
    return new Promise((resolve, reject) => {
        tool.custom_sql(db, `delete from DOSSIER`).then(() => {
            tool.custom_sql(db, `delete from MP3`).then(() => {
                tool.custom_sql(db, `delete from sqlite_sequence where name='MP3'`).then(() => {
                    tool.custom_sql(db, `delete from sqlite_sequence where name='DOSSIER'`).then(() => {
                        tool.custom_sql(db, `delete from FAVORIS`).then(() => {
                            console.log("LEs deletes sont faits ! ")
                            resolve('ok')
                        })
                    })
                })
            })
        }).catch((err) => {
            console.log(err)
            reject(err)
        })
    })
}



async function record_directory(path, folder_name, parent_directory) {
    return new Promise((resolve, reject) => {
        var chemin = (path + '' + folder_name);
        // createRoot()
        console.log('sdfdsf123')
        find_content(chemin, parent_directory).then((truc) => {
            nbr_fichier = 0;
            console.log(`/////////////FINDCONTENT ////////////////////// \n
// Nom du dossier : ${folder_name} //  
            `)
            resolve(truc);
        }).catch((err) => {
            console.log('Erreur de scanDirectory sur path : ' + folder_name, err)
            reject(err)
        })
    })
}


async function complete_sous_dossier() {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * from DOSSIER`;
        db.all(sql, [], (err, rows) => {
            if (err) {
                throw err;
            }
            console.log(`
            // Il y'a ${rows.length} DOSSIERS a traiter             `)
            var j = 0;
            let promises = [];
            rows.forEach((row) => {
                console.log('sdio66')
                promises.push(record_directory(row.path.replace(row.name, ''), row.name, row));
            })
            resolve(Promise.all(promises));
        });
    })
}

/**
 * exemple d'utilisation : 
 *  let obj_plylist = {
            title: null,
            owner: null,
            trackCount: null,
            dateYear: null,
            channelId: null,
            content: []
        }
*      load_yt_api('PL-Je9XPLvTKkjsS4tSDFLv-KFdGsalEoo', "Maplayslist", '', obj_plylist)
 * @param {*} id_playlist 
 * @param {*} nom_playlist 
 * @param {*} pageToken  a vide 
 * @param {*} obj_plylist 
 * @returns 
 */
async function load_yt_api(id_playlist, nom_playlist, pageToken, obj_plylist) {
    return new Promise((resolve, reject) => {
        const yt_key = 'AIzaSyCXH7UZfE8T1y67yjP0wrPPmupE-0yCdSA';
        let url_api = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&maxResults=300&playlistId=${id_playlist}&key=${yt_key}&pageToken=${pageToken}`;
        console.log("on rcoi un appel sur load_yt()")
        const url_api_playlist_info = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${id_playlist}&key=${yt_key}`
        axios.get(url_api_playlist_info) // on chope les info de la playlist avant tout ! 
            .then(function (response) {
                if (response.data.pageInfo.totalResults > 0) {
                    var data_playlist = response.data.items[0];

                    // On reccupe les infos des items de playlist
                    obj_plylist.playlistId = id_playlist;
                    obj_plylist.owner = data_playlist.snippet.channelTitle;
                    obj_plylist.title = data_playlist.snippet.title;
                    obj_plylist.thumbnails = data_playlist.snippet.thumbnails[0]
                    obj_plylist.channelId = data_playlist.snippet.channelId;

                    if (nom_playlist == "" || nom_playlist == undefined) {
                        console.log("y'a pas de titre alors on prend celui de la playlist : " + data_playlist.snippet.title)
                        nom_playlist = data_playlist.snippet.title;
                    }
                    axios.get(url_api)
                        .then(function (resp) {
                            var data_items = resp.data;

                            var this_pageToken = data_items.nextPageToken;
                            let count = 0;
                            data_items.items.forEach((value) => {

                                (function (value_) {
                                    var url_video_info = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${value.snippet.resourceId.videoId}&key=${yt_key}`;
                                    axios.get(url_video_info) // on chope les info des video ! 
                                        .then(function (info_vdo) {
                                            if (info_vdo.data.items[0]) {
                                                var data_video = info_vdo.data

                                                console.log(count + "/ " + Object.keys(data_items.items).length + " --- " + this_pageToken + ' : ' + data_video.items[0].snippet.channelTitle + " FROM " + value_.snippet.title)
                                                // On ajoute l'item a la liste :  
                                                var item = {
                                                    videoId: value_.snippet.resourceId.videoId,
                                                    name: value_.snippet.title,
                                                    author: {
                                                        name: data_video.items[0].snippet.channelTitle || 'no name',
                                                        browseId: null
                                                    },
                                                    duration: (data_video.items[0].contentDetails.duration / 1000),
                                                    thumbnails: [
                                                        {
                                                            url: value_.snippet.thumbnails.default.url,
                                                            width: value_.snippet.thumbnails.default.width,
                                                            heigth: value_.snippet.thumbnails.default.heigth
                                                        }
                                                    ]
                                                }
                                                obj_plylist.content.push(item)

                                                count++;
                                                if (count >= Object.keys(data_items.items).length) {
                                                    if (this_pageToken !== undefined) {
                                                        console.log("************* PAGE " + count + "/" + Object.keys(data_items.items).length + " ********")
                                                        resolve(
                                                            load_yt_api(id_playlist, nom_playlist, this_pageToken, obj_plylist)
                                                        )

                                                    } else {

                                                        let promises = [];
                                                        (obj_plylist.content).forEach((row) => {
                                                            var thisMp3 = resetMp3();
                                                            thisMp3.name = row.name;
                                                            thisMp3.path = 'https://www.youtube.com/watch?v=' + row.videoId;
                                                            thisMp3.title = row.name;
                                                            thisMp3.tag_album = row.thumbnails.url;
                                                            thisMp3.parent_id = 100000
                                                            thisMp3.extension = 'youtube'
                                                            promises.push(tool.insert(db, "MP3", thisMp3));

                                                            promises.push();
                                                        })
                                                        resolve(Promise.all(promises));

                                                    }
                                                }
                                            } else {
                                                count++;
                                            }
                                        })
                                })(value)
                            })
                        }).catch(function (error) {
                            // handle error
                            console.log(error);
                            reject(error)
                        })
                } else {
                    reject('Aucune playlist le correspond')
                }
            }).catch(function (error) {
                // handle error
                console.log(error);
                res.json(error)
            })
    });
}





async function find_content(chemin, parent_directory) {
    try {
        let promises = [];
        let fichiers = fs.readdirSync(chemin, { encoding: 'utf8' });
        if (fichiers) {
            console.log('// Findcontent : ' + chemin + " \n // Avec " + fichiers.length + 'fichiers !')
            if (fichiers.length > 0) {

                fichiers.sort();
                nbr_fichiers = 0;
                //for (const fichier of fichiers){
                fichiers.forEach((fichier) => {
                    var ex_nbr_fichiers = nbr_fichiers;
                    console.log(nbr_fichiers + '/' + fichiers.length + ' => ' + fichier)
                    if (fs.lstatSync(chemin + '/' + fichier).isDirectory()) {
                        var thisDossier = resetDossier();

                        thisDossier.name = fichier.trim();
                        thisDossier.path = chemin + '/' + fichier;
                        thisDossier.parent_id = parent_directory.id;
                        promises.push(tool.insert(db, "DOSSIER", thisDossier));
                        nbr_fichiers++;
                    } else if (fs.lstatSync(chemin + '/' + fichier).isFile()) {
                        const audio_file_extension = ['.MP3', '.WAV', '.WMA', '.FLAC'];
                        const picture_file_extension = ['.JPG', '.JPEG', '.PNG'];
                        if (audio_file_extension.includes(path.extname(fichier).toUpperCase()) &&
                            fichier.substring(0, 2) !== "._"
                        ) {
                            var thisMp3 = resetMp3();
                            thisMp3.name = fichier.trim();
                            thisMp3.path = chemin + '/' + fichier;
                            thisMp3.title = thisMp3.name.replace('.mp3', '').trim();
                            thisMp3.parent_id = parent_directory.id;
                            thisMp3.extension = path.extname(fichier);
                            promises.push(tool.insert(db, "MP3", thisMp3));
                            nbr_fichiers++;
                        } else if (picture_file_extension.includes(path.extname(fichier).toUpperCase())) {
                            if (parent_directory.cover == "") {
                                promises.push(tool.update(db, 'DOSSIER', { cover: chemin + '/' + fichier }, { id: parent_directory.id }))
                                tool.update(db, 'DOSSIER', { cover: chemin + '/' + fichier }, { id: parent_directory.id })
                                nbr_fichiers++;
                            } else {
                                nbr_fichiers++;
                            }
                        } else {
                            nbr_fichiers++;
                        }
                    } else {
                        nbr_fichiers++;
                    }
                    if (nbr_fichiers === fichiers.length - 1) {
                        console.log("Parse des fichiers temrinée")
                    }
                })
            }
        }
        return Promise.all(promises);
    } catch (gloal_error) {
        console.log(gloal_error)
    }
}


// Démarrage du serveur HTTP (pour les sats)
const httpServer = http.createServer(app);
httpServer.listen(port_http, (p) => {
    console.log(chalk.bgGreenBright(`ecoute sur le port HTTP   ${chalk.blackBright(port_http)}  ... `));

})


// Démarrage du serveur HTTPS
const httpsServer = https.createServer(credentials, app);
console.log(credentials)
httpsServer.listen(443, () => {
    console.log(chalk.bgGreenBright(`ecoute sur le port HTTPS  ${chalk.blackBright(443)}  ... `));
    
})


// TO DO: Modularize this component as it gets out of hand

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const fs = require('fs');


const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));



app.use(session({
    secret: "maDude",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect(process.env.MONGO_PASSWORD, {
    useNewUrlParser: true
});

mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    login: {
        type: String,
        unique: true
    },
    email: String,
    password: String,
    userType: {
        type: String,
        default: 'member'
    },
    eventsJoined: [String]
});

const tournamentSchema = new mongoose.Schema({
    title: String,
    date: String,
    description: String,
    participants: [String],
    status: String,
    archived: {
        type: String,
        default: 'no'
    },
    scores: []
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const Tournament = new mongoose.model("Tournament", tournamentSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/social', function (req, res) {
    res.render('social');
});
app.get('/failure', function (req, res) {
    res.render('failure');
});

app.get('/login', function (req, res) {
    res.render('login');

});

app.get('/register', function (req, res) {
    res.render('register');

});

app.get('/tournament', function (req, res) {

    if (req.isAuthenticated()) {

        const userLogin = req.user.login;
        const userType = req.user.userType;
        const userEvents = req.user.eventsJoined;

        Tournament.find({
            archived: "no"
        }, function (err, foundEvents) {
            if (err) {
                console.log(err);
            } else {
                if (foundEvents) {
                    res.render("tournament", {
                        foundEvents: foundEvents,
                        userType: userType,
                        userLogin: userLogin,
                        userEvents: userEvents
                    });
                    console.log(foundEvents);

                }
            }
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/login');
});


app.post("/userJoin", function (req, res) {

    if (req.isAuthenticated()) {

        const userLogin = req.user.login;
        const userType = req.user.userType;
        const eventId = req.body.userJoin;


        Tournament.findById(eventId, function (err, foundEvents) {
            if (err) {
                console.log(err);

            } else {
                if (foundEvents) {
                    let participantsVar = foundEvents.participants;
                    shuffleArray(participantsVar);

                    res.render("tournament-player", {
                        userType: userType,
                        userLogin: userLogin,
                        eventId: eventId,
                        participants: participantsVar,
                        tournament: foundEvents

                    });
                }

            }
        });
    } else {
        res.redirect('/login');
    }

});



app.post("/register", function (req, res) {

    User.register({
            username: req.body.username,
            login: req.body.login
        },
        req.body.password,
        function (err, user) {
            if (err) {
                console.log(err);
                res.redirect('register');
            } else {
                passport.authenticate('local')(req, res, function () {
                    res.redirect('tournament');
                });
            }

        });

});

app.post('/login', function (req, res) {

    const user = new User({
        username: req.body.username,
        password: req.body.password,
    });
    console.log(user);
    req.login(user, function (err) {
        if (err) {
            console.log(err);

        } else {
            passport.authenticate('local', function (err, user, info) {
                if (err) {
                    return err;
                }
                // Redirect if it fails
                if (!user) {
                    return res.redirect('/failure');
                }
                req.logIn(user, function (err) {
                    if (err) {
                        return err;
                    }
                    // Redirect if it succeeds
                    return res.redirect('/tournament');
                });
            })(req, res);

        }
    });


});


app.post('/update', function (req, res) {

    const newTournament = new Tournament({
        title: req.body.title,
        date: req.body.date,
        description: req.body.desc,
        status: "noactive"
    });

    newTournament.save(function (err) {
        if (err) {
            console.log(err);

        } else {
            res.redirect('/tournament');
        }
    });

});

app.post('/delete', function (req, res) {
    const id = req.body.deleteEvent;
    Tournament.findByIdAndRemove(id, function (err) {
        if (!err) {
            res.redirect('/tournament');
        }
    });
});

app.post('/join', function (req, res) {
    const eventId = req.body.joinEvent;
    const userId = req.user.id;
    const userLogin = req.user.login;

    if (req.isAuthenticated()) {
        User.findByIdAndUpdate({
                "_id": userId
            }, {
                "$addToSet": {
                    "eventsJoined": eventId
                }
            },
            function (err, raw) {
                if (err) return handleError(err);
                console.log('The raw response from Mongo was ', raw);
            }
        );
        Tournament.findByIdAndUpdate({
                "_id": eventId
            }, {
                "$addToSet": {
                    "participants": userLogin
                }
            },
            function (err, raw) {
                if (err) return handleError(err);
                console.log('The raw response from Mongo was ', raw);
            }
        );
        res.redirect('/tournament');
    } else {
        res.redirect('/login');
    }

});


app.post('/optOut', function (req, res) {
    const eventId = req.body.optOut;
    const userId = req.user.id;
    const userLogin = req.user.login;

    if (req.isAuthenticated()) {
        User.findByIdAndUpdate({
                "_id": userId
            }, {
                "$pull": {
                    "eventsJoined": eventId
                }
            },
            function (err, raw) {
                if (err) return handleError(err);
                console.log('The raw response from Mongo was ', raw);
            }
        );

        Tournament.findByIdAndUpdate({
                eventId
            }, {
                "$pull": {
                    "participants": userLogin
                }
            },
            function (err, raw) {
                if (err) return handleError(err);
                console.log('The raw response from Mongo was ', raw);
            }
        );
        res.redirect('/tournament');
    } else {
        res.redirect('/login');
    }

});

app.post('/activateEvent', function (req, res) {
    const id = req.body.activateEvent;
    Tournament.updateOne({
        _id: id
    }, {
        status: 'active'
    }, function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect('/tournament');
        }
    })
});


app.post('/endRound', function (req, res) {
    let body = req.body;
    const userType = req.user.userType;
    const userLogin = req.user.login;
    const eventId = req.body.endRound;
    let ranking = [];
    for (let player in body) {
        ranking.push([player, body[player]]);
    }
    ranking.sort(function (a, b) {
        return a[1] - b[1];
    });
    ranking.reverse().shift();
    Tournament.findByIdAndUpdate(eventId, {
        scores: ranking
    }, function (err) {
        console.log(err);
    });
    res.render("tournament-ranking", {
        userLogin: userLogin,
        ranking: ranking,
        userType: userType,
        eventId: eventId
    });



});

app.post('/endTournament', function (req, res) {

    const id = req.body.endTournament;
    Tournament.findByIdAndUpdate(id, {
        archived: "yes"
    }, function (err) {
        if (!err) {
            res.redirect('/tournament');
        }
    });

});


let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}


app.listen(port, function () {
    console.log('Server has started!');
});


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
//uploading photos
/*const PhotosSchema = new mongoose.Schema({
    url : String,
    img: {
        data: Buffer,
        contentType: String
    }
});
const Photos = new mongoose.model("Photos", PhotosSchema);
app.get('/generator', function (req, res) {
    res.render('generator');
});
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});
const storage = cloudinaryStorage({
    cloudinary: cloudinary,
    folder: "demo",
    allowedFormats: ["jpg", "png"],
    transformation: [{
        width: 500,
        height: 500,
        crop: "limit"
    }]
});
const parser = multer({
    storage: storage
});

app.post('/uploading', parser.single("image"), function (req, res) {

    const Image = new Photos ({
        url: req.file.url,
        id : req.file.public_id
    });
    Photos.create(Image) // save image information in database
    console.log(Image.url)
    res.render('generator');
});
*/
//const Photos = require('../modules/upload');

app.get('/generator', function (req, res) {
    res.render('generator');
});

// const path = require('path');

// app.use(express.static(__dirname+ "./public/"));

// const storage = multer.diskStorage({
//     destination: './public/uploads/',
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
// });

// const upload = multer({
//     storage: storage,
//     fileFilter: function (req, file, cb) {
//         checkFileType(file, cb);
//     }
// }).single('myImage');

// function checkFileType(file, cb){
// const filetypes = /jpeg|jpg|png|gif/;
// const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
// const mimetype = filetypes.test(file.mimetype);
// if (mimetype && extname) {
//     return cb(null, true);
// } else {
//     cb('Error: Images Only!');
// }
// };
app.use(express.static('./public'));

const PhotosSchema = new mongoose.Schema({
    img: {
        data: Buffer,
        contentType: String,
        id: String
    }
});
const Photos = new mongoose.model("Photos", PhotosSchema);

app.post('/uploading', (req, res) => {

    upload(req, res, (err) => {
        if (err) {
            res.render('generator', {
                msg: err
            });
        } else {
            if (req.file == undefined) {
                res.render('generator', {
                    msg: 'Error: No File Selected!'
                });
            } else {
                res.render('generator', {
                    msg: 'File Uploaded!',
                    file: `uploads/${req.file.filename}`
                });
            }
        }
    });
});
app.get('/render', function (req, res) {
    res.render('generator');
});
/*
mongoose.connection.on('open', function () {
    let photos = new Photos;
    photos.img.data = fs.readFileSync(imgPath);
    photos.img.contentType = 'image/png';
    photos.save(function (err, a) {
        if (err) throw err;
        console.error('saved img to mongo');

        app.get('/display', function (req, res, next) {
            Photos.findById(photos, function (err, doc) {
                if (err) return next(err);
                res.contentType(doc.img.contentType);
                res.send(doc.img.data);
            });
        });
    })
});*/

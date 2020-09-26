const express = require("express");
const bodyParser = require("body-parser");
const multer  = require('multer');
const MongoClient = require("mongodb").MongoClient;
const Service = require("./services/Service");
const Validator = require("./services/Validator");
const Sender = require("./services/Sender");
const formData = require("express-form-data");
const os = require("os");
const fs = require('fs');

const app = express();
const urlencodedParser = bodyParser.urlencoded({extended: false});
const mongoClient = new MongoClient("mongodb://localhost:27017/", { useNewUrlParser: true, useUnifiedTopology: true });
let dbClient;
process.env.TZ = 'Europe/Moscow';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + '/static/img/photo')
  },
  filename: function (req, file, cb) {
    let name = Date.now() + '.' + file.originalname.split('.').reverse()[0];
    req.body.photo = `static/img/photo/${name}`;
    cb(null, name)
  }
});

const upload = multer({ storage: storage });

app.post("/set-photo", upload.single('photo'),  function(req, res) {
  let validation = Validator.validateText(req.body.photo, 'Photo');
  if(validation !== true) {
    res.status(400).send(Object.assign({status: 'error', },validation));
    return;
  }

  req.app.locals.collection.findOne(
    {token: {$ne: null, $eq: req.body.token}},
    function(err, result){
      let name = __dirname + '/' + result.photo;
      fs.unlinkSync(name);
    }
  );

  req.app.locals.collection.findOneAndUpdate(
    {token: {$ne: null, $eq: req.body.token}},
    { $set: {photo: req.body.photo === 'null' ? null : req.body.photo}},
    {
      returnOriginal: false
    },
    function(err, result){
      if(err) {
        res.status(400).send({status: 'error', photo: 'Server error'});
      } else if(result.lastErrorObject.n !== 1) {
        res.status(400).send({status: 'error', photo: 'Incorrect authentication'});
      } else {
        res.send({status: 'success'});
      }
    }
  );

});


const options = {
  uploadDir: os.tmpdir(),
  autoClean: true
};

app.use(formData.parse(options));
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());

app.use("/static", express.static(__dirname + "/static"));


mongoClient.connect(function(err, client){
  if(err) {
    return console.error(err);
  }
  dbClient = client;
  app.locals.collection = client.db("water").collection("users");
  app.listen(3001, function(){
    console.log(new Date().toISOString() + ": Server run...");
  });
});

app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
})

var CronJob = require('cron').CronJob;
var job = new CronJob('0 */1 * * * *', function() {
  let date = new Date()
  date.setDate(date.getDate() - 1)
  date.toLocaleDateString().substr(0,5);
  let notification_time = date.toLocaleTimeString().substr(0,5);
  if(notification_time === '00:00') {
    req.app.locals.collection.updateMany(
      {},
      { $addToSet: {history: {labels: date, data: "$water"}, $set: {water: 0 }}},
      {
        returnOriginal: false
      },
      function(err, result){
        console.log(`${notification_time}: Water cleared, Labels added...`);
      }
    );
  }
  app.locals.collection.find({
    notification_array: notification_time
  }).toArray(function(err, results){
    if(results) {
      if(results.length > 0) {
        for (let i = 0; i < results.length; i++) {
          if(results[i].notification_stop && results[i].water >= results[i].target) {
            break;
          }
          console.log(`Message sent to: "${results[i].name}"...`);
          for (let j = 0; j < results[i].fcmtoken.length; j++) {
            Sender.send(results[i].fcmtoken[j],  'Выпей 🚿', results[i].sound);
          }
        }
      }
    }
  });
});
job.start();

app.post("/preregister", urlencodedParser, function(req, res){
  let validation = [Validator.validateString(req.body.name, 'Name'), Validator.validatePhone(req.body.phone, 'Phone'),
    Validator.validateText(req.body.fcmtoken, 'FCMToken')];
  if(validation[0] !== true || validation[1] !== true || validation[2] !== true) {
    if(validation[0] === true) validation[0] = {};
    if(validation[1] === true) validation[1] = {};
    if(validation[2] === true) validation[2] = {};
    res.status(400).send( Object.assign({status: 'error' }, validation[0], validation[1], validation[2]));
    return;
  }

  const user = Service.getUser();
  user.name = req.body.name.trim();
  user.phone =  req.body.phone;
  user.fcmtoken.push(req.body.fcmtoken);
  user.code =  Service.createCode();
  let date = new Date();
  date.setHours(date.getHours() + 2);
  user.date_of_preregistration_end = parseInt(date.getTime()/1000);

  req.app.locals.collection.insertOne(user, function(err, result){
    if(err) {
      res.status(400).send({status: 'error', phone: 'Phone isn\'t unique'});
    } else {
      Sender.sendSMS(user.phone,  `Код: ${user.code} \nОтправитель: JSay`);
      res.send({status: 'success'});
    }
  });

});

app.post("/register", urlencodedParser, function(req, res){
  let validation = Validator.validateCode(req.body.code, 'Code');
  if(validation !== true) {
    res.status(400).send(Object.assign({status: 'error', },validation));
    return;
  }

  let date = new Date();
  date.setDate(date.getDate() + 30);

  req.app.locals.collection.findOneAndUpdate(
      {code: req.body.code, date_of_preregistration_end: {$gte: parseInt(new Date().getTime()/1000)}},
      { $set: {token: Service.createToken(), date_of_next_send: parseInt(date.getTime()/1000), code: null}},
      {
        returnOriginal: false
      },
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        }else if(result.lastErrorObject.n !== 1) {
          res.status(400).send({status: 'error', code: 'Incorrect data'});
        } else {
          res.send({status: 'success', token: result.value.token});
        }
      }
  );

});

app.post("/set-fcmtoken", urlencodedParser, function(req, res){
  let validation = Validator.validateText(req.body.fcmtoken, 'FCMToken');
  if(validation !== true) {
    res.status(400).send(Object.assign({status: 'error', },validation));
    return;
  }

  req.app.locals.collection.findOneAndUpdate(
      {token: {$ne: null, $eq: req.body.token}},
      { $addToSet: {fcmtoken: req.body.fcmtoken.trim()}},
      {
        returnOriginal: false
      },
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', photo: 'Server error'});
        } else if(result.lastErrorObject.n !== 1) {
          res.status(400).send({status: 'error', photo: 'Incorrect authentication'});
        } else {
          res.send({status: 'success'});
        }
      }
  );

});

app.post("/reset-fcmtoken", urlencodedParser, function(req, res){
  let validation = Validator.validateText(req.body.fcmtoken, 'FCMToken');
  if(validation !== true) {
    res.status(400).send(Object.assign({status: 'error', },validation));
    return;
  }

  req.app.locals.collection.findOneAndUpdate(
      {token: {$ne: null, $eq: req.body.token}},
      {  $pull : {fcmtoken: {$in: [req.body.fcmtoken.trim()]}}},
      {
        returnOriginal: false
      },
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', photo: 'Server error'});
        } else if(result.lastErrorObject.n !== 1) {
          res.status(400).send({status: 'error', photo: 'Incorrect authentication'});
        } else {
          res.send({status: 'success'});
        }
      }
  );

});

app.post("/auth", urlencodedParser, function(req, res){
  let validation = [Validator.validatePhone(req.body.phone, 'Phone')];
  if(validation[0] !== true) {
    if(validation[0] === true) validation[0] = {};
    res.status(400).send( Object.assign({status: 'error' }, validation[0]));
    return;
  }

  req.app.locals.collection.findOne(
      {phone: req.body.phone, token: {$ne: null}},
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'User doesn\'t exist'});
        }else {
          res.send({status: 'success', token: result.token});
        }
      }
  );

});

app.get("/restore", urlencodedParser, function(req, res){
  let validation = Validator.validatePhone(req.query.phone.replace(' ', '+'), 'Phone');
  if(validation !== true) {
    res.status(400).send( Object.assign({status: 'error' }, validation));
    return;
  }

  req.app.locals.collection.findOne(
      {phone: req.query.phone.replace(' ', '+'), token: {$ne: null}},
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'User doesn\'t exist data'});
        } else {
          Sender.sendSMS(result.phone,  `Имя: ${result.name} \nОтправитель: JSay`);
          res.send({status: 'success', name: result.name});
        }
      }
  );

});


app.get("/get-photo", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
    {token: {$ne: null, $eq: req.query.token}},
    function(err, result){
      if(err) {
        res.status(400).send({status: 'error', phone: 'Server error'});
      } else if(!result) {
        res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
      }else {
        res.send({status: 'success', photo: result.photo});
      }
    }
  );
});

app.get("/get-info", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
      {token: {$ne: null, $eq: req.query.token}},
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
        }else {
          res.send({status: 'success', name: result.name, phone: result.phone, photo: result.photo});
        }
      }
  );
});

app.post("/set-info", urlencodedParser, function(req, res){
  let validation = [Validator.validateString(req.body.name, 'Name'), Validator.validatePhone(req.body.phone, 'Phone')];
  if(validation[0] !== true || validation[1] !== true) {
    if(validation[0] === true) validation[0] = {};
    if(validation[1] === true) validation[1] = {};
    res.status(400).send( Object.assign({status: 'error' }, validation[0], validation[1]));
    return;
  }

  req.app.locals.collection.findOneAndUpdate(
      {token: {$ne: null, $eq: req.body.token}},
      { $set: {phone: req.body.phone, name: req.body.name}},
      {
        returnOriginal: false
      },
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
        }else {
          res.send({status: 'success'});
        }
      }
  );
});

app.get("/get-sound", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
      {token: {$ne: null, $eq: req.query.token}},
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
        }else {
          res.send({status: 'success', sound: result.sound});
        }
      }
  );
});

app.post("/set-sound", urlencodedParser, function(req, res){
  let validation = Validator.validateBool(req.body.sound, 'Sound');
  if(validation !== true) {
    res.status(400).send(Object.assign({status: 'error', },validation));
    return;
  }

  let sound = req.body.sound;
  sound = sound === 'true' ? true : (sound === 'false' ? false : sound);

  req.app.locals.collection.findOneAndUpdate(
      {token: {$ne: null, $eq: req.body.token}},
      { $set: {sound: sound}},
      {
        returnOriginal: false
      },
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
        }else {
          res.send({status: 'success'});
        }
      }
  );
});

app.post("/add-water", urlencodedParser, function(req, res){
  let validation = Validator.validateNumber(req.body.water, 'Water');
  if(validation !== true) {
    res.status(400).send(Object.assign({status: 'error', },validation));
    return;
  }

  req.app.locals.collection.findOneAndUpdate(
      {token: {$ne: null, $eq: req.body.token}},
      { $inc: {water: Number.parseInt(req.body.water)}},
      {
        returnOriginal: false
      },
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
        }else {
          res.send({status: 'success'});
        }
      }
  );
});

app.post("/remove-water", urlencodedParser, function(req, res){
  let validation = Validator.validateNumber(req.body.water, 'Water');
  if(validation !== true) {
    res.status(400).send(Object.assign({status: 'error', },validation));
    return;
  }

  req.app.locals.collection.findOneAndUpdate(
      {token: {$ne: null, $eq: req.body.token}},
      { $inc: {water: -Number.parseInt(req.body.water)}},
      {
        returnOriginal: false
      },
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
        }else {
          res.send({status: 'success'});
        }
      }
  );
});

app.get("/get-notification", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
    {token: {$ne: null, $eq: req.query.token}},
    function(err, result){
      if(err) {
        res.status(400).send({status: 'error', phone: 'Server error'});
      } else if(!result) {
        res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
      }else {
        res.send({
          status: 'success',
          notification_stop: result.notification_stop,
          notification_start: result.notification_start,
          notification_end: result.notification_end,
          notification_interval: result.notification_interval,
        });
      }
    }
  );
});

let calculateNotificationIntervals = function (start, end, interval) {
  interval = Number.parseInt(interval);
  let sHours = Number.parseInt(start.substr(0,2));
  let eHours = Number.parseInt(end.substr(0,2));
  let sMinutes = Number.parseInt(start.substr(3,2));
  let eMinutes = Number.parseInt(end.substr(3,2));
  let arrayTimes = [];

  for (let i = sHours; i <= eHours; i += interval) {
    if(i === eHours && sMinutes > eMinutes){
      break;
    }
    arrayTimes.push(i + ':' + sMinutes);
  }

  return arrayTimes;
}

app.post("/set-notification", urlencodedParser, function(req, res){
  let validation = [
    Validator.validateBool(req.body.notification_stop, 'Notification stop'),
    Validator.validateTime(req.body.notification_start, 'Notification time start'),
    Validator.validateTime(req.body.notification_end, 'Notification time end'),
    Validator.validateNumber(req.body.notification_interval, 'Notification interval'),
  ];
  if(validation[0] !== true || validation[1] !== true || validation[2] !== true || validation[3] !== true) {
    if(validation[0] === true) validation[0] = {};
    if(validation[1] === true) validation[1] = {};
    if(validation[2] === true) validation[2] = {};
    if(validation[3] === true) validation[3] = {};
    res.status(400).send( Object.assign({status: 'error' }, validation[0], validation[1],validation[2],validation[3]));
    return;
  }

  let notification_stop = req.body.notification_stop;
  notification_stop = notification_stop === 'true' ? true : (notification_stop === 'false' ? false : notification_stop);

  req.app.locals.collection.findOneAndUpdate(
    {token: {$ne: null, $eq: req.body.token}},
    { $set: {notification_stop: notification_stop, notification_start: req.body.notification_start,
        notification_end: req.body.notification_end, notification_interval: req.body.notification_interval,
        notification_array: calculateNotificationIntervals(req.body.notification_start, req.body.notification_end, req.body.notification_interval)}},
    {
      returnOriginal: false
    },
    function(err, result){
      if(err) {
        res.status(400).send({status: 'error', phone: 'Server error'});
      } else if(!result) {
        res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
      }else {
        res.send({status: 'success'});
      }
    }
  );
});


app.get("/get-volume", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
    {token: {$ne: null, $eq: req.query.token}},
    function(err, result){
      if(err) {
        res.status(400).send({status: 'error', phone: 'Server error'});
      } else if(!result) {
        res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
      }else {
        res.send({
          status: 'success',
          volume: result.volume,
        });
      }
    }
  );
});

app.post("/set-volume", urlencodedParser, function(req, res){
  let validation = [
    Validator.validateNumber(req.body.half_glass, 'Half glass'),
    Validator.validateNumber(req.body.glass, 'Glass'),
    Validator.validateNumber(req.body.cup, 'Cup'),
    Validator.validateNumber(req.body.bottle, 'Bottle'),
  ];
  if(validation[0] !== true || validation[1] !== true || validation[2] !== true || validation[3] !== true) {
    if(validation[0] === true) validation[0] = {};
    if(validation[1] === true) validation[1] = {};
    if(validation[2] === true) validation[2] = {};
    if(validation[3] === true) validation[3] = {};
    res.status(400).send( Object.assign({status: 'error' }, validation[0], validation[1],validation[2],validation[3]));
    return;
  }

  req.app.locals.collection.findOneAndUpdate(
    {token: {$ne: null, $eq: req.body.token}},
    { $set: {volume: {
      half_glass: req.body.half_glass,
      glass: req.body.glass,
      cup: req.body.cup,
      bottle: req.body.bottle,
    }}},
    {
      returnOriginal: false
    },
    function(err, result){
      if(err) {
        res.status(400).send({status: 'error', phone: 'Server error'});
      } else if(!result) {
        res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
      }else {
        res.send({status: 'success'});
      }
    }
  );
});

app.get("/get-history", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
    {token: {$ne: null, $eq: req.query.token}},
    function(err, result){
      if(err) {
        res.status(400).send({status: 'error', phone: 'Server error'});
      } else if(!result) {
        res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
      }else {
        res.send({status: 'success', history: result.history });
      }
    }
  );
});

app.get("/get-weight", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
    {token: {$ne: null, $eq: req.query.token}},
    function(err, result){
      if(err) {
        res.status(400).send({status: 'error', phone: 'Server error'});
      } else if(!result) {
        res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
      }else {
        res.send({status: 'success', weight: result.weight, target: result.target, });
      }
    }
  );
});

app.post("/set-weight", urlencodedParser, function(req, res){
  let validation = [Validator.validateNumber(req.body.weight, 'Weight'),
    Validator.validateNumber(req.body.target, 'Target')];
  if(validation[0] !== true || validation[1] !== true) {
    if(validation[0] === true) validation[0] = {};
    if(validation[1] === true) validation[1] = {};
    res.status(400).send( Object.assign({status: 'error' }, validation[0], validation[1]));
    return;
  }

  req.app.locals.collection.findOneAndUpdate(
    {token: {$ne: null, $eq: req.body.token}},
    { $set: {weight: Number.parseInt(req.body.weight), target: Number.parseInt(req.body.target)}},
    {
      returnOriginal: false
    },
    function(err, result){
      if(err) {
        res.status(400).send({status: 'error', phone: 'Server error'});
      } else if(!result) {
        res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
      }else {
        res.send({status: 'success'});
      }
    }
  );
});

app.post("/congratulation", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
      {token: {$ne: null, $eq: req.body.token}},
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
        } else {
          let date_of_next_send = result.date_of_next_send;
          if (date_of_next_send <= parseInt(new Date().getTime()/1000) && date_of_next_send !== null) {
            req.app.locals.collection.findOneAndUpdate(
                {token: req.body.token},
                { $set: {date_of_next_send: null}},
                {returnOriginal: false},
                function(err, result){
                  if(err) {
                    res.status(400).send({status: 'error', phone: 'Server error'});
                  } else if(!result) {
                    res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
                  }else {
                    res.send({status: 'success', result: true});
                  }
                }
            );
          } else {
            res.send({status: 'success', result: false});
          }
        }
      }
  );
});


app.post("/support", urlencodedParser, function(req, res){
  let validation = [Validator.validateText(req.body.message, 'Message'), Validator.validateEmail(req.body.email, 'Email')];
  if(validation[0] !== true || validation[1] !== true) {
    if(validation[0] === true) validation[0] = {};
    if(validation[1] === true) validation[1] = {};
    res.status(400).send( Object.assign({status: 'error' }, validation[0], validation[1]));
    return;
  }

  Service.sendEmail(req.body.message, req.body.email ).then((response) => {
      res.send({status: 'success'});
  }).catch((error) => {
    console.log(error)
      res.status(400).send({status: 'error', email: 'Server error'});
  });

});

process.on("SIGINT", () => {
  dbClient.close();
  process.exit();
});
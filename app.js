const express = require("express");
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const Service = require("./services/Service");
const Validator = require("./services/Validator");
const Sender = require("./services/Sender");

const app = express();
const urlencodedParser = bodyParser.urlencoded({extended: false});
const mongoClient = new MongoClient("mongodb://localhost:27017/", { useNewUrlParser: true, useUnifiedTopology: true });
let dbClient;
process.env.TZ = 'Europe/Moscow'

mongoClient.connect(function(err, client){
  if(err) {
    return console.error(err);
  }
  dbClient = client;
  app.locals.collection = client.db("db").collection("users");
  app.listen(3000, function(){
    console.log(new Date().toISOString() + ": Server run...");
  });
});

var CronJob = require('cron').CronJob;
var job = new CronJob('0 */1 * * * *', function() {
  let notification_time = new Date().toLocaleTimeString().substr(0,5);
  app.locals.collection.find({notification_time: notification_time, sound: true, notification: true}).toArray(function(err, results){
    if(results.length > 0) {
      console.log(new Date().toISOString() + ": Messages sent");
      for (let i = 0; i < results.length; i++) {
        Sender.send(results[i].fcmtoken,  'Message');
      }
    }
  });
});
job.start();

app.post("/preregister", urlencodedParser, function(req, res){
  let validation = [Validator.validateString(req.body.name, 'Name'), Validator.validatePhone(req.body.phone, 'Phone'),
    Validator.validateText(req.body.fcmtoken, 'FCMToken')];
  if(validation[0] !== true || validation[1] !== true) {
    if(validation[0] === true) validation[0] = {};
    if(validation[1] === true) validation[1] = {};
    if(validation[2] === true) validation[2] = {};
    res.status(400).send( Object.assign({status: 'error' }, validation[0], validation[1], validation[2]));
    return;
  }

  const user = Service.getUser();
  user.name = req.body.name;
  user.phone =  req.body.phone;
  user.fcmtoken =  req.body.fcmtoken;
  user.code =  Service.createCode();
  let date = new Date();
  date.setHours(date.getHours() + 2);
  user.date_of_preregistration_end = parseInt(date.getTime()/1000);

  req.app.locals.collection.insertOne(user, function(err, result){
    if(err) {
      res.status(400).send({status: 'error', phone: 'Phone isn\'t unique'});
    } else {
      Sender.send(user.fcmtoken,  user.code);
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

app.post("/auth", urlencodedParser, function(req, res){
  let validation = [Validator.validateString(req.body.name, 'Name'), Validator.validatePhone(req.body.phone, 'Phone')];
  if(validation[0] !== true || validation[1] !== true) {
    if(validation[0] === true) validation[0] = {};
    if(validation[1] === true) validation[1] = {};
    res.status(400).send( Object.assign({status: 'error' }, validation[0], validation[1]));
    return;
  }

  req.app.locals.collection.findOne(
      {phone: req.body.phone, name: req.body.name},
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'User doesn\'t exist data'});
        }else {
          res.send({status: 'success', token: result.token});
        }
      }
  );

});

app.get("/restore", urlencodedParser, function(req, res){
  let validation = Validator.validatePhone(req.body.phone, 'Phone');
  if(validation !== true) {
    res.status(400).send( Object.assign({status: 'error' }, validation));
    return;
  }

  req.app.locals.collection.findOne(
      {phone: req.body.phone},
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'User doesn\'t exist data'});
        }else {
          res.send({status: 'success', name: result.name});
        }
      }
  );

});

app.post("/set-photo", urlencodedParser, function(req, res){
  let validation = Validator.validateText(req.body.photo, 'Photo');
  if(validation !== true) {
    res.status(400).send(Object.assign({status: 'error', },validation));
    return;
  }

  req.app.locals.collection.findOneAndUpdate(
      {token: req.body.token},
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

app.get("/get-photo", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
    {token: req.body.token},
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
      {token: req.body.token},
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
      {token: req.body.token},
      { $set: {photo: req.body.photo, name: req.body.name}},
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
      {token: req.body.token},
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
      {token: req.body.token},
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

app.get("/get-notification", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
      {token: req.body.token},
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', phone: 'Incorrect authentication'});
        }else {
          res.send({status: 'success', notification: result.notification, notification_time: result.notification_time});
        }
      }
  );
});

app.post("/set-notification", urlencodedParser, function(req, res){
  let validation = [Validator.validateBool(req.body.notification, 'Notification'),
    Validator.validateTime(req.body.notification_time, 'Notification time')];
  if(validation[0] !== true || validation[1] !== true) {
    if(validation[0] === true) validation[0] = {};
    if(validation[1] === true) validation[1] = {};
    res.status(400).send( Object.assign({status: 'error' }, validation[0], validation[1]));
    return;
  }

  let notification = req.body.notification;
  notification = notification === 'true' ? true : (notification === 'false' ? false : notification);

  req.app.locals.collection.findOneAndUpdate(
      {token: req.body.token},
      { $set: {notification: notification, notification_time: notification !== false ? req.body.notification_time : null}},
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
      {token: req.body.token},
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
      res.status(400).send({status: 'error', email: 'Server error'});
  });

});

process.on("SIGINT", () => {
  dbClient.close();
  process.exit();
});
const express = require("express");
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const Service = require("./services/Service");
const Validator = require("./services/Validator");

const app = express();
const urlencodedParser = bodyParser.urlencoded({extended: false});
const mongoClient = new MongoClient("mongodb://localhost:27017/", { useNewUrlParser: true, useUnifiedTopology: true });
let dbClient;

// app.get("/", function(request, response){
//   response.send("Главная страница");
// });
//
// app.get("/register", urlencodedParser, function (request, response) {
//   response.sendFile(__dirname + "/register.html");
// });
//
// app.post("/register", urlencodedParser, function (request, response) {
//   if(!request.body) {
//     return response.sendStatus(400);
//   }
//   console.log(request.body);
//   response.send(`${request.body.userName} - ${request.body.userAge}`);
// });

mongoClient.connect(function(err, client){
  if(err) {
    return console.log(err);
  }
  dbClient = client;
  app.locals.collection = client.db("db").collection("users");
  app.listen(3000, function(){
    console.log("Сервер запущен...");
  });
});

app.post("/preregister", urlencodedParser, function(req, res){
  let validation = [Validator.validateString(req.body.name, 'Name'), Validator.validatePhone(req.body.phone, 'Phone')];
  if(validation[0] !== true || validation[1] !== true) {
    if(validation[0] === true) validation[0] = {};
    if(validation[1] === true) validation[1] = {};
    res.status(400).send( Object.assign({status: 'error' }, validation[0], validation[1]));
    return;
  }

  const user = Service.getUser();
  user.name = req.body.name;
  user.phone =  req.body.phone;
  user.code =  Service.createCode();
  let date = new Date();
  date.setHours(date.getHours() + 2);
  user.date_of_preregistration_end = parseInt(date.getTime()/1000);

  req.app.locals.collection.insertOne(user, function(err, result){
    if(err) {
      res.status(400).send({status: 'error', phone: 'Phone isn\'t unique'});
    } else {
      // TODO: Sender.send(user.phone, user.code);
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

app.post("/restore", urlencodedParser, function(req, res){
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
      { $set: {photo: req.body.photo}},
      {
        returnOriginal: false
      },
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(result.lastErrorObject.n !== 1) {
          res.status(400).send({status: 'error', code: 'Incorrect authentication'});
        } else {
          res.send({status: 'success'});
        }
      }
  );

});

app.post("/get-info", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
      {token: req.body.token},
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', code: 'Incorrect authentication'});
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
          res.status(400).send({status: 'error', code: 'Incorrect authentication'});
        }else {
          res.send({status: 'success'});
        }
      }
  );
});

app.post("/get-sound", urlencodedParser, function(req, res){
  req.app.locals.collection.findOne(
      {token: req.body.token},
      function(err, result){
        if(err) {
          res.status(400).send({status: 'error', phone: 'Server error'});
        } else if(!result) {
          res.status(400).send({status: 'error', code: 'Incorrect authentication'});
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
          res.status(400).send({status: 'error', code: 'Incorrect authentication'});
        }else {
          res.send({status: 'success'});
        }
      }
  );
});

process.on("SIGINT", () => {
  dbClient.close();
  process.exit();
});
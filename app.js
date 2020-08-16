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

app.post("/register", urlencodedParser, function(req, res){
  let validation = [Validator.validateString(req.body.name, 'Name'), Validator.validatePhone(req.body.phone, 'Phone')];
  if(validation[0] !== true || validation[1] !== true) {
    if(validation[0] === true) validation[0] = {};
    if(validation[1] === true) validation[1] = {};
    res.status(400).send(Object.assign(validation[0], validation[1]));
    return;
  }

  let date = new Date();

  const user = Service.getUser();
  user.name = req.body.name;
  user.phone =  req.body.phone;
  user.code =  Service.createCode();
  user.token =  Service.createToken();
  user.date_of_preregistration = date;
  date.setDate(date.getDate() + 30);
  user.date_of_next_send = date;

  const collection = req.app.locals.collection;
  collection.insertOne(user, function(err, result){
    if(err) {
      res.status(400).send({phone: 'Phone isn\'t unique'});
    } else {
      // TODO: Sender.send(user.phone, user.code);
      res.send('Success');
    }
  });

});

process.on("SIGINT", () => {
  dbClient.close();
  process.exit();
});
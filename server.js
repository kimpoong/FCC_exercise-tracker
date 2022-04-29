const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
var { Schema } = mongoose;

var userSchema = new Schema({
  username: {
    type: String,
    required: true
  }
});

var logSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  description: String,
  duration: Number,
  date: Date
})

var userModel = mongoose.model('user', userSchema);
var logModel = mongoose.model('log', logSchema);

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  var username = req.body.username;
  var doc = await userModel.findOne({ username: username });
  if (doc) {
    return res.json({
      username: doc.username,
      _id: doc._id
    })
  } else {
    const new_doc = new userModel({ username: username });
    new_doc.save();
    return res.json({
      username: new_doc.username,
      _id: new_doc._id,
    })
  }
})

app.get('/api/users', async (req, res) => {
  var docs = await userModel.find().select('username _id').exec();
  return res.send(docs);
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  var _id = req.params._id;
  var description = req.body.description;
  var duration = parseInt(req.body.duration);
  var date = new Date(req.body.date || Date.now()).toDateString();
  var { username } = await userModel.findById(_id);
  const new_doc = new logModel({
    username: username,
    description: description,
    duration: duration,
    date: date
  })
  new_doc.save();
  return res.json({
    username: username,
    description: description,
    duration: duration,
    date: date,
    _id: _id
  })
})

app.get('/api/users/:_id/logs', async (req, res) => {
  var _id = req.params._id;
  var from = req.query.from;
  var to = req.query.to;
  var limit = req.query.limit;

  var { username } = await userModel.findById(_id);
  var dateFilter = {};
  if (from) {
    from = new Date(from);
    dateFilter['$gte'] = from;
  } else {
    dateFilter['$gte'] = new Date("1960-01-01");
  }
  if (to) {
    to = new Date(to);
    dateFilter['$lt'] = to;
  } else {
    dateFilter['$lt'] = Date.now();
  }

  var findFilter = {
    username: username,
    date: dateFilter
  }

  if (!limit) var logs_doc = await logModel.find(findFilter).select('-_id -username -__v').exec();
  else var logs_doc = await logModel.find(findFilter).select('-_id -username -__v').limit(limit).exec();
  var count = logs_doc.length;
  var logArray = [];
  logs_doc.forEach(log => {
    var logObj = {};
    logObj.description = log.description;
    logObj.duration = log.duration;
    logObj.date = log.date.toDateString();
    logArray.push(logObj);
  });

  var returnObj = {
    _id: _id,
    username: username,
    count: count,
    log: logArray
  }

  return res.json(returnObj);
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

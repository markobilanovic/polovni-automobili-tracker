var express = require('express');
var app = express();
var path = require('path');
const utils = require('./utils');

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/addRecord', (req, res) => {
    console.log(req.body);
  const {title, email, url} = req.body;
//   db.addNewTask(title, email, url);
    res.sendStatus(200);
});



app.listen(process.env.PORT || 4000, () => console.log('Node app is working!'));
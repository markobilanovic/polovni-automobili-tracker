var express = require('express');
var app = express();
var path = require('path');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/addRecord', (req, res) => {
  const {title, email, url} = req.body;
  db.addNewTask(title, email, url);
});


app.listen(process.env.PORT || 4000, () => console.log('Node app is working!'));
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const MongoDBSession = require('connect-mongodb-session')(session);

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

// Import Routes
const postsRoute = require('./routes/posts');
const authRoute = require('./routes/auth');
const adminRoute = require('./routes/admin');
const viewRoute = require('./routes/views');

dotenv.config();

// Connect to DB
mongoose.connect(process.env.DB_CONNECT, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
}, () => {
  console.log('Connected to MongoDB!');
});

const store = new MongoDBSession({
  uri: process.env.DB_CONNECT,
  collection: 'mySessions',
})

// Sockets
const users = {}

io.on('connection', socket => {
  socket.on('new-user', name => {
    users[socket.id] = name
    socket.broadcast.emit('user-connected', name)
  })
  socket.on('send-chat-message', message => {
    socket.broadcast.emit('chat-message', { message: message, name: users[socket.id] })
  })
  socket.on('disconnect', () => {
    socket.broadcast.emit('user-disconnected', users[socket.id])
    delete users[socket.id]
  })
});

// Middlewares
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: store,
}));

// Route Middelwares
app.use('/', viewRoute);
app.use('/api/posts', postsRoute);
app.use('/api/user', authRoute);
app.use('/api/admin', adminRoute);

http.listen(PORT, (error) => {
  if (error) {
    console.log(`Server start on port ${PORT} failed!`);
    console.log(error);
  }
  console.log(`Server up and running on port ${PORT}!`);
});

const express = require('express');
const app = express();
const http = require("http");
const { Server: SocketIO } = require('socket.io');
const path = require("path");
require('dotenv').config();

const server = http.createServer(app);

const io = new SocketIO(server);

const users = new Map();



// @ts-ignore
io.on('connection', socket => {
    console.log(`user-connected ${socket.id}`)
    users.set(socket.id, socket.id);


    io.emit('user-joined', socket.id);


    // @ts-ignore
    socket.on('outgoing:call', data => {
        const { fromOffer, to } = data

        socket.to(to).emit('incomming:call', { from: socket.id, offer: fromOffer })

    });

    // @ts-ignore
    socket.on('call:accepted', data => {
        const { answere, to } = data;
        socket.to(to).emit('incomming:answere', { from: socket.id, offer: answere })
    })



   socket.on('disconnect', () => {
    users.delete(socket.id);
    console.log(`user disconnected ${socket.id}`);
});

})
app.use(express.static(path.join(__dirname, "public")));
// @ts-ignore
app.get('/users', (req, res) => {
    return res.json(Array.from(users));
});

server.listen(3000, () => {
    console.log("listing on port 3000")
})







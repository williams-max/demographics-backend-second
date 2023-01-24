const express = require('express');
const server = express();
const bodyParser = require("body-parser");
const cors = require('cors');


const PORT = process.env.PORT || 4000;

server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());

server.use(cors({
    origin: '*'
}));

const showRoutes = require("./routes/index.js");

server.get('/', async (req, res) => {

    res.send("funciona");/**/
});
server.use("/api", showRoutes(server));



function handleErrors(err, req, res, next) {
    console.log(err);

 //   res.send(err)
    res.status(500).send('An internal server error occurred');
};


server.listen(PORT, err => {
    if (err) throw err;
    console.log(`> Ready on ${PORT}`);
});


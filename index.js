require('dotenv').config();
const express = require("express");
const app = express();
global.shippo = require("shippo")(process.env.shippo_key);
var { expressjwt: jwt } = require("express-jwt");
const PORT = process.env.PORT;
var jsonwebtoken = require('jsonwebtoken');
const dbConn= require('./db');
const routerShip=require("./shippo");
const routerUser=require("./user");

global.db=dbConn.db;

// For parsing application/json
app.use(express.json());
// For parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(
    jwt({
        secret: process.env.jwt_secret,
        algorithms: ["HS256"],
    }).unless({ path: ["/register","/login"] })
);
app.use(function (err, req, res, next) {
    if (err.name === "UnauthorizedError") {
        res.status(401).send("invalid token...");
    } else {
        next(err);
    }
});

app.use("/",routerUser);
app.use("/ship",routerShip);





app.listen(PORT, (err) => {
    if (!err) {
        console.log("Server Started at:" + PORT);
    }
})


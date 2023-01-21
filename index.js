require('dotenv').config();
const express = require("express");
const app = express();
const shippo = require("shippo")(process.env.shippo_key);
var { expressjwt: jwt } = require("express-jwt");
const PORT = process.env.PORT;
var jsonwebtoken = require('jsonwebtoken');
const Joi = require('joi');
const dbConn= require('./db');
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

app.post("/register", async (req, res, next) => {
    const body = req.body;
    const schema = Joi.object().keys({
        firstName: Joi.string().min(3).max(30).required(),
        lastName: Joi.string().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).pattern(new RegExp('^[a-zA-Z0-9!@#\$\^\&*\)\(+=._-]{8,}$')).required(),
        phone: Joi.string().min(10).pattern(new RegExp('^[0-9]{10,10}$')).required(),

    });
    const result = schema.validate(req.body);
    if (result.error) {
        return res.status(400).send(result.error.details[0].message);
    }
    try{
        let query=await db("user").insert({
            firstName:body.firstName,
            lastName:body.lastName,
            email:body.email,
            phone:body.phone,
            password:body.password
        });
        return res.status(200).json({
            message:"Registered Successfully"
        });

    }catch(err){
        console.log(err)
        return res.status(500).json({
            message:"Internal Server Error"
        });
    }
   
   
    


})


app.post("/login", async (req, res, next) => {
    const body = req.body;
    const schema = Joi.object().keys({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).pattern(new RegExp('^[a-zA-Z0-9!@#\$\^\&*\)\(+=._-]{8,}$')).required(),
    });
    const result = schema.validate(req.body);
    if (result.error) {
        return res.status(400).send(result.error.details[0].message);
    }
    try{
        let query=await db("user")
        .select(`userId`,`firstName`,`lastName`,`email`,`phone`)
        .where('email',body.email)
        .andWhere('password',body.password)


        if(query && query.length==1){
            let token = jsonwebtoken.sign({
                //exp: Math.floor(Date.now() / 1000) + (60 * 60),
                data: {
                    userId:query[0]["userId"],
                    name:query[0]["firstName"]+" "+query[0]["lastName"],
                }
            }, process.env.jwt_secret, { expiresIn: 7 * 60 * 60 });
            return res.status(200).json({
                message: "login success",
                token: token
            });
        }else{
            return res.status(400).json({
                    message:"Username and Password dont match"
            });
        }
        // return res.status(200).json({
        //     message:"Registered Successfully"
        // });

    }catch(err){
        console.log(err)
        return res.status(500).json({
            message:"Internal Server Error"
        });
    }
})


app.get("/testjwt1", async (req, res, next) => {
    const tokenData=req.auth.data;
    return res.status(200).json({
        carriers: "test"
    });
})




app.get("/carriers", async (req, res, next) => {

    try {
        let carriers = await shippo.carrieraccount.list();
        let res_carriers = {};
        carriers.results.forEach(element => {
            let entry = {};
            entry.carrierId = element.object_id;
            entry.carrierName = element.carrier_name;
            entry.carrierImages = element.carrier_images;
            res_carriers[element.carrier] = entry

        });
        return res.status(200).json({
            carriers: res_carriers
        });
    } catch (err) {

        return res.status(500).json({
            error: JSON.stringify(err)
        });
    }


})


app.listen(PORT, (err) => {
    if (!err) {
        console.log("Server Started at:" + PORT);
    }
})




const express = require('express');
const Joi = require('joi');
const router = express.Router();
var jsonwebtoken = require('jsonwebtoken');


router.post("/register", async (req, res, next) => {
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
        if(err.code && err.code=="ER_DUP_ENTRY"){
            return res.status(400).json({
                message: "Already an account exists with given email"
            });
        }
        return res.status(500).json({
            message:"Internal Server Error"
        });
    }
   
   
    


})


router.post("/login", async (req, res, next) => {
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

module.exports=router;
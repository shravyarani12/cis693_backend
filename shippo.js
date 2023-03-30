
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const moment = require('moment');
const axios = require("axios");
const nodemailer = require('nodemailer');



//Tracking:
router.post("/addTracking", async (req, res, next) => {
    let userId = req.auth.data.userId;
    let body = req.body;
    const schema = Joi.object().keys({
        name: Joi.string().min(3).max(80).required(),
        shippingProvider: Joi.string().min(1).max(11).required(),
        trackingNum: Joi.string().min(1).max(40).required(),
        status: Joi.string().optional(),
        labelUrl: Joi.string().optional(),
        shippoShipmentId: Joi.string().optional()
    });
    const result = schema.validate(req.body);
    if (result.error) {
        return res.status(400).send(result.error.details[0].message);
    }
    try {
        let query = await db("tracking").insert({
            "name": body.name,
            "shippingProvider": body.shippingProvider,
            "trackingNum": body.trackingNum,
            "userId": userId,
            "status": body.status ? body.status : '',
            "labelUrl":body.labelUrl?body.labelUrl:'',
            "shippoShipmentId":body.shippoShipmentId?body.shippoShipmentId:'',
            createdDateTime: moment().format('YYYY-MM-DD HH:mm:ss'),
            updatedDateTime: moment().format('YYYY-MM-DD HH:mm:ss')
        });

        try {
            const uri = `https://api.goshippo.com/tracks/?carrier=${body.shippingProvider}&tracking_number=${body.trackingNum}`
            const response = await axios(uri, {
                method: 'post',
                body: null,
                //headers: { 'authorization': `ShippoToken ${process.env.shippo_key}` }
                headers: { 'authorization': `ShippoToken shippo_live_d33c92a86bae687bd2c907e695dd070c8a21befd` }
            });
            const data = await response.data;
            if (data.tracking_status?.status && data.tracking_status?.status == "DELIVERED") {
                let query = await db("tracking").where({
                    "name": body.name,
                    "shippingProvider": body.shippingProvider,
                    "trackingNum": body.trackingNum,
                    "userId": userId
                })
                    .update({
                        "status": 'DELIVERED',
                        updatedDateTime: moment().format('YYYY-MM-DD HH:mm:ss')
                    });
                return res.status(200).json({
                    status: "Tracking Added Succesfully"
                })
                // updateEntry("shippments", req.body.id, { status: "delivered" }, () => {
                //     console.log("Updated Record");
                //     return res.status(200).json(data)
                // })
            } else {
                return res.status(200).json(data)
            }
        } catch (err) {
            return res.status(200).json({
                status: "Tracking Added Succesfully"
            });
        }
    } catch (err) {
        return res.status(500).json({
            status: "Internal Server Error",
            "error": JSON.stringify(err)
        });
    }
})






router.get("/getTracking", async (req, res, next) => {
    let userId = req.auth.data.userId;
    let ds = [];
    let ps = [];
    try {
        let trackings = await db("tracking").select().where('userId', userId)
        for (let i = 0; i < trackings.length; i++) {
            if (trackings[i].status && trackings[i].status.toUpperCase() == "DELIVERED") {
                ds.push(trackings[i])
            } else {
                ps.push(trackings[i])
            }
        }
        return res.status(200).json({
            pendingShipments: ps,
            deliveredShipments: ds
        });
    } catch (err) {
        return res.status(500).json({
            status: "Internal Server Error",
            "error": JSON.stringify(err)
        });
    }
})

router.post("/deleteTracking", async (req, res, next) => {
    let userId = req.auth.data.userId;
    let body = req.body;
    let ds = [];
    let ps = [];
    try {
        let trackings = await db("tracking").where({ 'userId': userId, trackingId: body.trackingId }).del()
        return res.status(200).json({
            status: "deleted succesfully"
        });
    } catch (err) {
        return res.status(500).json({
            status: "Internal Server Error",
            "error": JSON.stringify(err)
        });
    }
})

router.post("/trackingMoreDetails", async (req, res, next) => {
    let myDate = new Date();
    myDate = myDate.toString();
    try {
        const uri = `https://api.goshippo.com/tracks/?carrier=${req.body.shipper}&tracking_number=${req.body.trackingNum}`
        const response = await axios(uri, {
            method: 'post',
            body: null,
            //headers: { 'authorization': `ShippoToken ${process.env.shippo_key}` }
            headers: { 'authorization': `ShippoToken ${process.env.shippo_prod_key}` }
        });
        const data = await response.data;

        //const data={"tracking_number":"1Z9708X20397087608","carrier":"ups","servicelevel":{"name":"Ground","token":"ups_ground"},"transaction":null,"address_from":{"city":"Wyoming","state":"MI","zip":"49519","country":"US"},"address_to":{"city":"Jacksonville","state":"FL","zip":"32202","country":"US"},"eta":null,"original_eta":null,"metadata":null,"test":false,"tracking_status":{"status_date":"2023-03-15T14:50:55Z","status_details":"Delivered","location":{"city":"Jacksonville","state":"FL","zip":"32202","country":"US"},"substatus":{"code":"delivered","text":"Package has been delivered.","action_required":false},"object_created":"2023-03-19T04:11:06.615Z","object_updated":"2023-03-19T04:11:06.615Z","object_id":"b6e7cc19ec8c412baea48f2d140e203f","status":"DELIVERED"},"tracking_history":[{"status_date":"2023-03-13T17:03:54Z","status_details":"Origin Scan","location":{"city":"Wyoming","state":"MI","zip":"","country":"US"},"substatus":{"code":"package_accepted","text":"Package has been accepted into the carrier network for delivery.","action_required":false},"object_created":"2023-03-19T04:11:06.615Z","object_updated":"2023-03-19T04:11:06.615Z","object_id":"08256f960b2b405faf9e9e3e17bb8843","status":"TRANSIT"},{"status_date":"2023-03-14T01:09:00Z","status_details":"Departed from Facility","location":{"city":"Wyoming","state":"MI","zip":"","country":"US"},"substatus":{"code":"package_departed","text":"Package has departed from an intermediate location in the carrier network.","action_required":false},"object_created":"2023-03-19T04:11:06.615Z","object_updated":"2023-03-19T04:11:06.615Z","object_id":"304fe2b3c78844dd9f4a37de2ab97513","status":"TRANSIT"},{"status_date":"2023-03-14T18:58:00Z","status_details":"Arrived at Facility","location":{"city":"Jacksonville","state":"FL","zip":"","country":"US"},"substatus":{"code":"package_arrived","text":"Package has arrived at an intermediate location in the carrier network.","action_required":false},"object_created":"2023-03-19T04:11:06.615Z","object_updated":"2023-03-19T04:11:06.615Z","object_id":"adbc254783be469e8af67d8e41c01341","status":"TRANSIT"},{"status_date":"2023-03-15T09:14:45Z","status_details":"Processing at UPS Facility","location":{"city":"Jacksonville","state":"FL","zip":"","country":"US"},"substatus":{"code":"package_processing","text":"Package is processing at an intermediate location in the carrier network.","action_required":false},"object_created":"2023-03-19T04:11:06.615Z","object_updated":"2023-03-19T04:11:06.615Z","object_id":"e3dcb4dea25e4777a5c101bc045f6be0","status":"TRANSIT"},{"status_date":"2023-03-15T13:31:13Z","status_details":"Out For Delivery Today","location":{"city":"Jacksonville","state":"FL","zip":"","country":"US"},"substatus":{"code":"out_for_delivery","text":"Package is out for delivery.","action_required":false},"object_created":"2023-03-19T04:11:06.615Z","object_updated":"2023-03-19T04:11:06.615Z","object_id":"de097453d3774a4aa14a93cd44006ac0","status":"TRANSIT"},{"status_date":"2023-03-15T14:50:55Z","status_details":"Delivered","location":{"city":"Jacksonville","state":"FL","zip":"32202","country":"US"},"substatus":{"code":"delivered","text":"Package has been delivered.","action_required":false},"object_created":"2023-03-19T04:11:06.615Z","object_updated":"2023-03-19T04:11:06.615Z","object_id":"b6e7cc19ec8c412baea48f2d140e203f","status":"DELIVERED"}],"messages":[]};
        if (data.tracking_status?.status && data.tracking_status?.status == "DELIVERED") {
            //if (true) {
            return res.status(200).json(data)
            // updateEntry("shippments", req.body.id, { status: "delivered" }, () => {
            //     console.log("Updated Record");
            //     return res.status(200).json(data)
            // })
        } else {
            return res.status(200).json(data)
        }
    } catch (err) {
        return res.status(500).json({
            status: "Internal Server Error",
            "error": JSON.stringify(err)
        });
    }


})

router.post("/pendingTrackingMoreDetails", async (req, res, next) => {
    let myDate = new Date();
    myDate = myDate.toString();
    let userId = req.auth.data.userId;
    
    try {
        let trackingsFrom = await db("tracking").select()
        .innerJoin('shipment', 'tracking.shippoShipmentId', 'shipment.shippo_shipmentId')
        .innerJoin('address','address.shippo_addressId','shipment.addressFrom')
        .where({
            'tracking.userId':userId,
            'tracking.trackingId':req.body.trackingNum
        })

        let trackingsTo = await db("tracking").select()
        .innerJoin('shipment', 'tracking.shippoShipmentId', 'shipment.shippo_shipmentId')
        .innerJoin('address','address.shippo_addressId','shipment.addressTo')
        .where({
            'tracking.userId':userId,
            'tracking.trackingId':req.body.trackingNum
        })
        trackingsFrom=trackingsFrom[0];
        trackingsTo=trackingsTo[0];
        let response={
            "tracking_number":trackingsFrom.trackingNum,
            "carrier":trackingsFrom.shippingProvider,
            "servicelevel":{},
            "address_from":{
                "city":trackingsFrom.city,"state":trackingsFrom.state,"zip":trackingsFrom.zip,"country":trackingsFrom.country
            },
            "address_to":{
                "city":trackingsTo.city,"state":trackingsTo.state,"zip":trackingsTo.zip,"country":trackingsTo.country
            },
            "tracking_status":{"status_date":"","status_details":"Pending","status":"Pending"}
        }
        // console.log(trackingsFrom)
        // console.log(trackingsTo)
        try {

            const uri = `https://api.goshippo.com/tracks/?carrier=${trackingsFrom.shippingProvider}&tracking_number=${trackingsFrom.trackingNum}`
            
            const response = await axios(uri, {
                method: 'post',
                body: null,
                headers: { 'authorization': `ShippoToken ${process.env.shippo_key}` }
                //headers: { 'authorization': `ShippoToken ${process.env.shippo_prod_key}` }
            });
            const data = await response.data;
            if (data.tracking_status?.status && data.tracking_status?.status == "DELIVERED") {
               
                let query = await db("tracking").where({
                    "trackingId": req.body.trackingNum
                })
                .update({
                    "status": 'DELIVERED',
                    updatedDateTime: moment().format('YYYY-MM-DD HH:mm:ss')
                });

                data.tracking_number=trackingsFrom.trackingNum;
                return res.status(200).json(data)
            } else {
                return res.status(200).json(response);
            }
        } catch (err) {
            return res.status(200).json(response);
        }
    } catch (err) {
        return res.status(500).json({
            status: "Internal Server Error",
            "error": JSON.stringify(err)
        });
    }
})





router.get("/carriers", async (req, res, next) => {

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


router.get("/getRates", async (req, res, next) => {
    let query = req.query;
    try {
        let rates = await shippo.shipment.rates(query.shipmentId);
        return res.status(200).json({
            carriers: rates
        });
    } catch (err) {
        return res.status(500).json({
            error: JSON.stringify(err)
        });
    }
})


router.post("/createShipmentLabel", async (req, res, next) => {
    let body = req.body;
    try {
        shippo.transaction.create({
            "rate": body.rateId,
            "label_file_type": "PDF",
            "async": false
        }, function (err, transaction) {
            // asynchronous callback
            if (!err) {


                return res.status(200).json({
                    transaction: transaction
                });
            } else {
                return res.status(500).json({
                    error: JSON.stringify(err)
                });
            }
        });

    } catch (err) {
        return res.status(500).json({
            error: JSON.stringify(err)
        });
    }
})



router.post("/addAddress", async (req, res, next) => {

    let userId = req.auth.data.userId;
    let body = req.body;
    const schema = Joi.object().keys({
        name: Joi.string().min(3).max(80).required(),
        street1: Joi.string().min(3).max(80).required(),
        city: Joi.string().min(3).max(80).required(),
        state: Joi.string().min(2).max(80).required(),
        zip: Joi.string().min(5).max(5).pattern(new RegExp('^[0-9]{5,5}$')).required(),
        country: Joi.string().min(2).max(80).required(),
        company: Joi.string(),
        street2: Joi.any(),
        savedb: Joi.string(),
    });
    const result = schema.validate(req.body);
    if (result.error) {
        return res.status(400).send(result.error.details[0].message);
    }
    try {
        var addAddress = await shippo.address.create({
            "name": body.name,
            "street1": body.street1,
            "street2": body.street2 && body.street2.length>0 ? body.street2 : null,
            "city": body.city,
            "state": body.state,
            "zip": body.zip,
            "country": body.country,
            "metadata": userId
        });

        let addObjectId = addAddress["object_id"];

        shippo.address.validate(addObjectId, async function (err, cbAddress) {
            if (!err) {
                if (cbAddress.validation_results.is_valid) {
                    if (body.savedb == "true") {
                        try {

                            let query = await db("address").insert({
                                "name": body.name,
                                "street1": cbAddress.street1,
                                "street2": cbAddress.street2 ? cbAddress.street2 : "",
                                "city": body.city,
                                "state": body.state,
                                "zip": cbAddress.zip,
                                "country": body.country,
                                "userId": userId,
                                shippo_addressId: addObjectId,
                                createdDateTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                                updatedDateTime: moment().format('YYYY-MM-DD HH:mm:ss')
                            });
                            return res.status(200).json({
                                status: "Address Added Succesfully",
                                response: cbAddress,
                                addressId:addObjectId

                            });
                        } catch (err) {
                            return res.status(500).json({
                                status: "Internal Server Error",
                                "error": JSON.stringify(err)
                            });
                        }
                    } else {
                        return res.status(200).json({
                            status: "Valid Address",
                        });
                    }
                } else {
                    return res.status(400).json({
                        status: "Invalid address",
                        error: cbAddress.validation_results.messages[0].text
                    });
                }

            } else {
                return res.status(400).json({
                    status: "Invalid address",
                    "error": JSON.stringify(err)
                });
            }
        });
    } catch (err) {
        return res.status(500).json({
            error: JSON.stringify(err)
        });
    }

})


router.post("/addParcel", async (req, res, next) => {

    let userId = req.auth.data.userId;
    let body = req.body;
    const schema = Joi.object().keys({
        name: Joi.string().min(3).max(80).required(),
        length: Joi.string().min(1).max(11).required(),
        width: Joi.string().min(1).max(11).required(),
        height: Joi.string().min(1).max(11).required(),
        distance_unit: Joi.string().min(1).max(2).required(),
        weight: Joi.string().min(1).max(11).required(),
        mass_unit: Joi.string().min(1).max(2).required(),
        savedb: Joi.string()
    });

    const result = schema.validate(req.body);
    if (result.error) {
        return res.status(400).send(result.error.details[0].message);
    }
    try {
        var addParcel = await shippo.parcel.create({
            "length": body.length,
            "width": body.width,
            "height": body.height,
            "distance_unit": body.distance_unit,
            "weight": body.weight,
            "mass_unit": body.mass_unit,
            "metadata": userId
        });
        let addObjectId = addParcel.object_id;
        if (addParcel.object_state == "VALID") {
            if (body.savedb == "true") {
                try {
                    let query = await db("parcel").insert({
                        "name": body.name,
                        "length": body.length,
                        "width": body.width,
                        "height": body.height,
                        "distance_unit": body.distance_unit,
                        "weight": body.weight,
                        "mass_unit": body.mass_unit,
                        "userId": userId,
                        shippo_parcelId: addObjectId,
                        createdDateTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                        updatedDateTime: moment().format('YYYY-MM-DD HH:mm:ss')
                    });
                    return res.status(200).json({
                        status: "Parcel Added Succesfully",
                        response: addParcel,
                        parcelId:addObjectId
                    });
                } catch (err) {
                    return res.status(500).json({
                        status: "Internal Server Error",
                        "error": JSON.stringify(err)
                    });
                }
            }else{
                return res.status(200).json({
                    status: "Valid Parcel"
                });
            }
        } else {
            return res.status(400).json({
                status: "Invalid Parcel Dimensions",
                "error": JSON.stringify(err)
            });
        }
    } catch (err) {
        return res.status(500).json({
            error: JSON.stringify(err)
        });
    }

})



router.post("/createShipment", async (req, res, next) => {

    let userId = req.auth.data.userId;
    let body = req.body;
    const schema = Joi.object().keys({
        addressFrom: Joi.string().min(3).max(80).required(),
        addressTo: Joi.string().min(3).max(80).required(),
        parcels: Joi.string().min(3).max(80).required(),
        name: Joi.string().min(3).max(80).required(),
    });

    const result = schema.validate(req.body);
    if (result.error) {
        return res.status(400).send(result.error.details[0].message);
    }
    Promise.all([getAddress(body.addressFrom), getAddress(body.addressTo), getParcel(body.parcels)]).then(async (values) => {
        try {
            var addShipment = await shippo.shipment.create({
                "address_from": values[0],
                "address_to": values[1],
                "parcels": values[2],
                "async": "true",
                "metadata": userId
            });
            console.log(addShipment)
            let addObjectId = addShipment["object_id"];
            if (addShipment.status !== "ERROR") {
                try {
                    let query = await db("shipment").insert({
                        "addressFrom": body.addressFrom,
                        "addressTo": body.addressTo,
                        "parcelId": body.parcels,
                        "name": body.name,
                        "userId": userId,
                        shippo_shipmentId: addObjectId,
                        createdDateTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                        updatedDateTime: moment().format('YYYY-MM-DD HH:mm:ss')
                    });
                    return res.status(200).json({
                        status: "Shipment Created Succesfully",
                        response: addShipment,
                        shipmentId:addObjectId
                    });
                } catch (err) {
                    return res.status(500).json({
                        status: "Internal Server Error",
                        "error": JSON.stringify(err)
                    });
                }
            } else {
                return res.status(400).json({
                    status: "Invalid Parcel Dimensions",
                    "error": JSON.stringify(err)
                });
            }
        } catch (err) {
            return res.status(500).json({
                error: JSON.stringify(err)
            });
        }
    }).catch(err => {
        console.log(err)
    });

    // 
})


router.post("/sendEmail", async (req, res, next) => {

    let userId = req.auth.data.userId;
    let body = req.body;
    console.log("*****************************************")
    console.log(body)
    console.log("*****************************************")

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.gmail_username,
          pass: process.env.gmail_password
        }
      });
      ``
      const mailOptions = {
        from: process.env.gmail_username,
        to: body.email,
        subject: 'Here is you label for '+body.name,
        text: JSON.stringify(body),
        html: `<h4>Personal Shipping Assistant:</h4>
        <p>&nbsp;</p>
        <p>Tracking Number: ${body.tracking_number}</p>
        <p>Tracking_status: ${body.tracking_status}</p>
        <p>Tracking URL Provider : <a href=${body.tracking_url_provider}>Click Here</a>
        </br> or use this link ${body.tracking_url_provider}</p>
        <p>Download Your Label:&nbsp;<a href=${body.label_url}>Click Here</a>
        </br> or use this link ${body.label_url}</p>
        <p>&nbsp;</p>
        ${(body.messages && body.messages.length > 0 && body.messages[0].text)?"<p>Messages:"+body.messages[0].text+"</p>":""}
        <p>&nbsp;</p>
        <p>&nbsp;</p>
        <p>Thanks for Using our App, Please reach us at</p>
        <div>
        <div><a href="mailto:personalshippingassistant@gmail.com">personalshippingassistant@gmail.com</a> for any queries</div>
        </div>`
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          return res.status(500).json({"status":"Failed to send mail"})
        } else {
          console.log('Email sent: ' + info.response);
          return res.status(200).json({"status":"Mail sent successfully"})
        }
      });
})

function getAddress(shippo_addressId) {
    return new Promise(async (resolve, reject) => {
        try {
            let address = await db("address").select().where('shippo_addressId', shippo_addressId)
            if (address && address.length == 1) {
                let addressObj = {
                    "name": address[0].name,
                    "street1": address[0].street1,
                    "street2": address[0].street2,
                    "city": address[0].city,
                    "state": address[0].state,
                    "zip": address[0].zip,
                    "country": address[0].country,
                    "object_id": address[0].shippo_addressId,
                    "metadata": address[0].userId
                }
                resolve(addressObj)
            } else {
                reject("No address Found")
            }

        } catch (err) {
            reject(err)
        }

    })

}


function getParcel(shippo_parcelId) {
    return new Promise(async (resolve, reject) => {
        try {
            let parcel = await db("parcel").select().where('shippo_parcelId', shippo_parcelId)
            if (parcel && parcel.length == 1) {
                let parcelobj = {
                    "length": parcel[0].length,
                    "width": parcel[0].width,
                    "height": parcel[0].height,
                    "distance_unit": parcel[0].distance_unit,
                    "weight": parcel[0].weight,
                    "mass_unit": parcel[0].mass_unit,
                    "object_id": parcel[0].shippo_parcelId,
                    "metadata": parcel[0].userId
                }
                resolve(parcelobj)
            } else {
                reject("No parcel Found")
            }
        } catch (err) {
            reject(err)
        }
    })
}
module.exports = router;

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const moment = require('moment');

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
        street2: Joi.string()


    });
    const result = schema.validate(req.body);
    if (result.error) {
        return res.status(400).send(result.error.details[0].message);
    }
    try {
        var addAddress = await shippo.address.create({
            "name": body.name,
            "street1": body.street1,
            "street2": body.street2 ? body.street2 : "",
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
                            response: cbAddress
                        });
                    } catch (err) {
                        return res.status(500).json({
                            status: "Internal Server Error",
                            "error": JSON.stringify(err)
                        });
                    }
                } else {
                    return res.status(200).json({
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
        let addObjectId = addParcel["object_id"];
        if (addParcel.object_state == "VALID") {
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
                    response: addParcel
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
        console.log()
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
                        response: addShipment
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
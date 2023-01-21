
const express = require('express');
const router = express.Router();
   


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



module.exports=router;
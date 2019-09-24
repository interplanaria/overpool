const axios = require('axios')
const datapay = require('datapay')
const overpool = require('../../index')
const pool = new overpool();
const seed = ["1"]
datapay.build({ data: seed }, (err, tx) => {
  pool.post({
    path: "loop",
    payment: {
      merchantData: null,
      transaction: tx.toString(),
      refundTo: null,
      memo: null
    }
  })
})

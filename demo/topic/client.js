const axios = require('axios')
const datapay = require('datapay')
const Overpool = require("../../index")
const pool = new Overpool();
const build = (items) => {
  return new Promise((resolve, reject) => {
    datapay.build({
      data: items
    }, (err, tx) => {
      resolve({
        merchantData: null,
        transaction: tx.toString(),
        refundTo: null,
        memo: null
      })
    })
  })
};
(async () => {
  for(let i=0; i<10; i++) {
    for (let j=0; j<3; j++) {
      let Payment = await build(["0x6d02", i.toString(), j.toString()]);
      let result = await pool.post({
        payment: Payment,
        path: "localhost",
        topic: "p" + i
      })
    }
  }
})();

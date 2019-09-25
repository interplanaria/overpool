const Overpool = require("../../index")
const fs = require('fs')
const datapay = require('datapay')
const pool = new Overpool();
const buildTx = (i) => {
  return new Promise((resolve, reject) => {
    datapay.build({
      data: ["hello", i.toString()]
    }, async (err, tx) => {
      if (err) {
        reject(err)
      } else {
        resolve(tx)
      }
    })
  })
}
(async () => {
  await pool.create({ path: "localhost", port: 3001 })
  pool.on("tx", async (e) => {
    // compare the new event with the get query
    let queried = await pool.get({
      path: "localhost",
      hash: e.parsed.tx.h
    })
    console.log("Event = ", e.parsed)
    console.log("Queried = ", queried)
  })
  for (let i=0; i<10; i++) {
    let tx = await buildTx(i)
    await pool.post({
      payment: { transaction: tx },
      path: "localhost"
    })
    .catch((e) => {
      console.log(e)
    })
  }
})();

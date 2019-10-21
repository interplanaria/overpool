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
  await pool.initServer({ port: 3001 })
  pool.create({ path: "localhost" })
  pool.on("tx", (e) => {
    console.log(e)
    fs.readdir("overpool/localhost", (err, items) => {
      console.log("## Current Ledger State ##")
      console.log(items)
    })
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

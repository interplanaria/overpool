const Overpool = require("../../index")
const fs = require('fs')
const datapay = require('datapay')
const pool = new Overpool();
(async () => {
  await pool.create({ path: "localhost", port: 3001 })
  pool.on("tx", (e) => {
    console.log(e)
    fs.readdir("overpool/localhost", (err, items) => {
      console.log("## Current Ledger State ##")
      console.log(items)
    })
  })
  for (let i=0; i<10; i++) {
    await pool.post({
      payment: { transaction: "sdfsf" },
      path: "localhost"
    })
    .catch((e) => {
      console.log("error = ", e)
    })
  }
})();

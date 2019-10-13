// Creating multiple endpoints
const Overpool = require("../../index")
const fs = require('fs')
const pool = new Overpool();
pool.create({ path: "p3001", port: 3001 })
pool.create({ path: "p3002", port: 3002 })
pool.on("tx", (e) => {
  console.log(e)
  fs.readdir("overpool/localhost", (err, items) => {
    console.log("## Current Ledger State ##")
    console.log(items)
  })
})

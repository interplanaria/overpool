const Overpool = require("../../index")
const fs = require('fs')
const pool = new Overpool();
pool.create({ path: "localhost", port: 3001 })
pool.on("tx", (e) => {
  console.log(e)
  fs.readdir("overpool/localhost", (err, items) => {
    console.log("## Current Ledger State ##")
    console.log(items)
  })
})

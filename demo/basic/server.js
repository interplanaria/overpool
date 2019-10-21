const Overpool = require("../../index")
const fs = require('fs')
const pool = new Overpool();

(async () => {
  await pool.initServer({ port: 3001 });
  pool.create({ path: "localhost" });
  pool.on("tx", (e) => {
    console.log(e)
    fs.readdir("overpool/localhost", (err, items) => {
      console.log("## Current Ledger State ##")
      console.log(items)
    })
  })
})();
// Creating multiple endpoints
const Overpool = require("../../index")
const fs = require('fs')
const pool = new Overpool();

(async () => {
  pool.initServer();
  pool.create({ path: "pool1" })
  pool.create({ path: "pool2" })

  // pools can be added at any time.
  setTimeout(() => {
    pool.create({ path: "delayed" })
    console.log("delayed pool added")
  }, 2000);

  pool.on("tx", (e) => {
    console.log(e)
    fs.readdir("overpool/localhost", (err, items) => {
      console.log("## Current Ledger State ##")
      console.log(items)
    })
  })
})();

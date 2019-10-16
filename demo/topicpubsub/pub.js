// Creating multiple endpoints
const Overpool = require("../../index")
const fs = require('fs')
const pool = new Overpool();
var paths = [];
pool.create({ path: "localhost", port: 3001 });
(async () => {
  for(let i=0; i<1000; i++) {
    let key = await pool.pub({ path: "localhost", topic: "topic" + i })
    console.log("key = ", key, i)
  }
  pool.on("tx", (e) => {
    console.log(e)
  })
})();

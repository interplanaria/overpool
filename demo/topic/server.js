// Creating multiple endpoints
const Overpool = require("../../index")
const fs = require('fs')
const pool = new Overpool();
var paths = [];
pool.create({ path: "localhost", port: 3001 })
pool.on("tx", (e) => {
  console.log(e)
})

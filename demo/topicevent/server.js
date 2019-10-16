// Creating multiple endpoints
const Overpool = require("../../index")
const fs = require('fs')
const pool = new Overpool();
var paths = [];
pool.create({ path: "localhost", port: 3001 })
let i=0;
/*
pool.on("tx", (e) => {
  console.log(e.hash, i++)
})
*/
pool.on("tx:localhost", (e) => {
  console.log(e)
})
/*
pool.on("tx:localhost:p0", (e) => {
  console.log(e)
})
pool.on("tx:localhost:p99", (e) => {
  console.log(e)
})
*/

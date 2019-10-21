const Overpool = require("../../index")
const fs = require('fs')
const datapay = require('datapay');
const pool = new Overpool();
var counter = 0;
(async () => {
  await pool.initServer()
  pool.create({ path: "loop" })
  let key = await pool.pub({ path: "loop" })
  console.log("key = ", key)
  pool.on("tx", (e) => {
    console.log("tx")
    let pushdata = e.parsed.out[0].tape[1].cell.map((c) => {
      return c.s
    })
    console.log("LOOP #"+counter, pushdata)
    counter++;
    if (counter <= 100) {
      let newpushdata = pushdata.concat(counter.toString())
      datapay.build({ data: newpushdata }, (err, tx) => {
        e.payment.transaction = tx.toString();
        pool.post({
          path: "loop",
          payment: e.payment
        })
      });
    }
  })
})();

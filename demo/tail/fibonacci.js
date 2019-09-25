const Overpool = require("../../index")
const datapay = require('datapay')
const fs = require('fs')
const postTx = async (pool, t) => {
  let posted = await pool.post({
    payment: {
      merchantData: null,
      transaction: t.toString(),
      refundTo: null,
      memo: null
    },
    path: "localhost"
  }).catch((e) => {
    console.log("Error", e)
  })
}
const buildTx = (fib) => {
  return new Promise((resolve, reject) => {
    datapay.build({
      safe: true,
      data: ["fibonacci", "" + fib]
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
  const pool = new Overpool();
  var fib = 0;
  var counter = 0;
  await pool.create({ path: "localhost", port: 3001 })
  pool.on("tx", async (e) => {
    console.log("Tape = ", JSON.stringify(e.parsed.out[0].tape, null, 2))
    if(counter++ <= 100) {
      let prev;
      let current;
      let tail = await pool.tail({ path: "localhost", size: 2 })
      if (tail.length === 2) {
        prev = tail[0];
        current = tail[1];
      } else if (tail.length === 1) {
        prev = tail[0] 
        current = tail[0]
      } else {
        // nothing
      }
      if (prev && current) {
        let prev_counter = parseInt(prev.parsed.out[0].tape[1].cell[1].s)
        let current_counter = parseInt(current.parsed.out[0].tape[1].cell[1].s)
        let new_counter = prev_counter + current_counter;
        let transaction = await buildTx(new_counter)
        await postTx(pool, transaction)
      }
    }
  })
  setTimeout(async () => {
    let transaction = await buildTx(1)
    postTx(pool, transaction).catch((e) => {
      console.log("Error = ", e)
    })
  }, 1000)
})();

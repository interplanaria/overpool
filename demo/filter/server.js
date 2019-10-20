const Overpool = require("../../index")
const pool = new Overpool();

(async () => {
  await pool.initServer({ port: 3001 });
  pool.create({
    path: "filtered_pool",
    filter: (e, cb) => {
      /******************************************
      *
      *  e := {
      *    merchantData: null,
      *    transaction:
      *    '0100000000010000000000000000296a2231394878696756345179427633744870515663554551797131707a5a56646f417574046173666400000000',
      *    refundTo: null,
      *    memo: null,
      *    parsed: { 
      *      tx: { 
      *        h: 'da19359e5e91ce7962cf42a885e0dc4c5c7a3a66823637caf15002d422d8f77d' 
      *      },
      *      in: [],
      *      out: [ [Object] ] 
      *    }
      *  }
      *
      ********************************************/
      // only pass through if the protocol starts with "19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut" (B protocol)
      let t = e.parsed;
      if (t.out[0].tape[1].cell[0] && 
          t.out[0].tape[1].cell[0].s === "19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut") {
        cb(null, true)
      } else {
        cb("must containt at least one input")
      }
    }
  })
  pool.on("tx", (e) => {
    console.log(e)
  })
})();

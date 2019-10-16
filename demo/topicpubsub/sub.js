const Overpool = require('../../index')
const pool = new Overpool();
(async () => {
  let key = await pool.sub({ path: process.argv[2] });
  console.log("key=", key)
  pool.on("tx", (e) => {
    console.log(e)
  })
})();

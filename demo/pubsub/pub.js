const Overpool = require('../../index')
const pool = new Overpool();
(async () => {
  pool.create({ path: "localhost" })
  let key = await pool.pub({
    path: "localhost"
  });
  console.log("key = ", key)
  pool.on("tx", (e) => {
    console.log(e)
  })
})();

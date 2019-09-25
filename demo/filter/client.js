const axios = require('axios')
const datapay = require('datapay')
const build = () => {
  return new Promise((resolve, reject) => {
    console.log(process.argv.slice(2))
    datapay.build({
      data: process.argv.slice(2)
    }, (err, tx) => {
      resolve({
        merchantData: null,
        transaction: tx.toString(),
        refundTo: null,
        memo: null
      })
    })
  })
};
(async () => {
  let Payment = await build();
  let result = await axios.post('http://localhost:3001/filtered_pool', Payment)
  .catch(function (error) {
    console.log(error);
  });
  console.log(result.data)
})();

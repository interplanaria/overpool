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

  // p3001
  let result = await axios.post('http://localhost:3000/pool1', Payment)
  .catch(function (error) {
    console.log(error);
  });
  console.log("p3001", result.data)

  // p3002
  result = await axios.post('http://localhost:3000/pool2', Payment)
  .catch(function (error) {
    console.log(error);
  });
  console.log("p3002", result.data)
})();

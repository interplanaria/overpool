const express = require('express')
const fs = require('fs')
const path = require('path')
const bsv = require('bsv')
const bpu = require('bpu');
const Dat = require('dat-node')
const readline = require('readline')
const Stream = require('stream')
const Tail = require('./tail')

class Overpool {
  constructor(o) {
    this.path = (o && o.path ? o.path + "/overpool" : process.cwd() + "/overpool")
    this.subscribed = [];
    this.filters = {}
    this.dats = {};
    this.tails = {};
  }
  join(store, key) {
    return new Promise((resolve, reject) => {
      if (key) {
        if (!fs.existsSync(store)) {
          fs.mkdirSync(store, { recursive: true })
        }
        Dat(store, key, (err, dat) => {
          if (err) throw err
          dat.joinNetwork()
          dat.network.on('connection', () => {
            console.log('connected', key)
          })
          dat.network.on('connection-closed', () => {
            console.log('connection closed')
          })
          this.dats[key] = dat;
          resolve(dat.key.toString('hex'))
        })
      } else {
        Dat(store, (err, dat) => {
          if (err) throw err
          console.log("import")
          dat.importFiles({watch: true})
          dat.joinNetwork()
          dat.network.on('connection', () => {
            console.log("connected", dat.key.toString("hex"))
          })
          dat.network.on('connection-closed', () => {
            console.log('connection closed')
          })
          this.dats[key] = dat;
          resolve(dat.key.toString('hex'))
        })
      }
    })
  }
  async pub(o) {
    if (o && o.path) {
      let discoveryKey = await this.join(this.path + "/" + o.path)
      this.publicKey = discoveryKey
      return discoveryKey;
    } else {
      throw new Error("Must specify path")
    }
  }
  async sub(o) {
    if (o && o.path) {
      let discoveryKey = await this.join(this.path + "/" + o.path, { key: o.path })
      this.subscribed.push({
        key: o.path,
        path: this.path + "/" + o.path
      })
      return discoveryKey;
    } else {
      throw new Error("Must specify path")
    }
  }
  create (o) {
    return new Promise((resolve, reject) => {
      let port = (o && o.port ? o.port : 3000);
      let poolPath = (o && o.path ? o.path : "localhost")
      if (o && o.filter) this.filters[poolPath] = o.filter;
      if (!fs.existsSync(this.path + "/" + poolPath)) {
        fs.mkdirSync(this.path + "/" + poolPath, { recursive: true })
      }
      this.app = express()
      this.app.use(express.json())
      this.app.use(express.urlencoded({ extended: true }))
      this.app.post("/" + poolPath, (req, res) => {
        let payment = req.body;
        this.post({ payment: payment, path: poolPath })
        .then((response) => {
          res.json(response)
        })
        .catch((error) => {
          res.json(error)
        })
      })
      this.subscribed.push({
        key: poolPath,
        path: this.path + "/" + poolPath
      })
      this.app.listen(port, () => {
        console.log("overpool", `listening to port:${port}!`)
        resolve();
      })
    })
  }
  post (o) {
    let payment = o.payment;
    let type = o.path;
    return new Promise((resolve, reject) => {
      /****************************************************

        BIP270 Format

        Payment {
          merchantData // string. optional.
          transaction // a hex-formatted (and fully-signed and valid) transaction. required.
          refundTo // string. paymail to send a refund to. optional.
          memo // string. optional.
        }

        PaymentACK {
          payment // Payment. required.
          memo // string. optional.
          error // number. optional.
        }

      ****************************************************/
      if (!payment.transaction) {
        reject({ payment: payment, error: "Must include hex-formatted transaction" })
      } else {
        bpu.parse({
          tx: { r: payment.transaction },
          transform: (o, c) => {
            if (c.buf && c.buf.byteLength > 512) {
              o.ls = o.s
              o.lb = o.b
              delete o.s
              delete o.b
            }
            return o
          },
          split: [
            { token: { s: "|" }, },
            { token: { op: 106 }, include: "l" }
          ]
        })
        .then((parsed) => {
          if (parsed) {
            let hash = parsed.tx.h;
            if (this.filters[type]) {
              let payload = payment
              payload.parsed = parsed
              this.filters[type](payload, (err, valid) => {
                if (err) {
                  reject({ payment: payment, error: "Unsupported transaction type" })
                } else {
                  try {
                    this._post({ hash: hash, payment: payment, path: type }).then((response) => {
                      resolve({ payment: payment, memo: response })
                    })
                  } catch (e) {
                    reject({ payment: payment, error: e })
                  }
                }
              })
            } else {
              this._post({ hash: hash, payment: payment, path: type }).then((response) => {
                resolve({ payment: payment, memo: response })
              })
            }
          } else {
            reject({ payment: payment, error: "Invalid Transaction" })
          }
        })
        .catch((e) => {
          reject({ payment: payment, error: e })
        })
      }
    })
  }
  async _post (o) {
    /**************************************
    *
    *  o := {
    *    hash: <transaction hash>,
    *    payment: <payment object>,
    *    path: <overpool path>
    *  }
    *
    **************************************/
    // generate hash
    if (o.hash && o.payment && o.path) {
      let poolPath = path.resolve(this.path, o.path)
      let filePath = path.resolve(poolPath, o.hash)
      await fs.promises.writeFile(filePath, JSON.stringify(o.payment))
      let tapePath = path.resolve(poolPath, "tape.txt")
      let line = "OVERPOOL " + o.hash + " " + Date.now() + "\n"
      await fs.promises.appendFile(tapePath, line);
    } else {
      throw new Error("The post object must contain three attributes: hash, payment, and path") 
    }
  }
  prune(id) {
    return new Promise((resolve, reject) => {
      // move the tape.txt to "tape-<timestamp>.txt"
      // create a new tape.txt
      if (id) {
        fs.rename(
          this.path + "/" + id + "/tape.txt", 
          this.path + "/" + id + "/tape-" + Date.now() + ".txt", 
          (err) => {
            if (err) {
              reject(err);
            } else {
              fs.closeSync(fs.openSync(this.path + "/" + id + "/tape.txt", 'w'));
              resolve();
            }
          }
        )
      } else {
        reject(new Error("Must specify the path"))
      }
    })
  }
  on (e, handler) {
    if (e === 'tx') {
      this.subscribed.forEach((p) => {
        if (!this.tails[p.path]) {
          let tail;
          try {
            if (!fs.existsSync(p.path + "/tape.txt")) {
              fs.closeSync(fs.openSync(p.path + "/tape.txt", 'w'));
            }
            tail = new Tail(p.path + "/tape.txt")
          } catch (e) {
            fs.closeSync(fs.openSync(p.path + "/tape.txt", 'w'));
            tail = new Tail(p.path + "/tape.txt")
          }
          this.tails[p.path] = tail
          tail.on("line", async (data) => {
            let chunks = data.split(" ")
            let type = chunks[0];
            let hash = chunks[1];
            this.read(p, hash, handler)
          });
          tail.on("close", () => {
            console.log("watch closed");
          })
          tail.on("error", (error) => {
            console.log("OVERPOOL", 'Tail error', error);
          });
          tail.watch();
        }
      })
    }
    return this;
  }
  read (p, hash, handler) {
    if (fs.existsSync(p.path + "/" + hash)) {
      fs.readFile(p.path + "/" + hash, "utf8", async (err, content) => {
        let payment = JSON.parse(content);
        let parsed = await bpu.parse({
          tx: { r: payment.transaction },
          transform: (o, c) => {
            if (c.buf && c.buf.byteLength > 512) {
              o.ls = o.s
              o.lb = o.b
              delete o.s
              delete o.b
            }
            return o
          },
          split: [
            { token: { s: "|" }, },
            { token: { op: 106 }, include: "l" }
          ]
        })
        handler({
          path: p.key,
          key: p.key,
          hash: hash,
          payment: JSON.parse(content),
          parsed: parsed
        })
      })
    } else {
      setTimeout(() => {
        this.read(p, hash, handler)      
      }, 1000)
    }
  }
  readPromise(o, txid) {
    return new Promise((resolve, reject) => {
      this.read ({ key: o.key, path: o.path }, txid, (result) => {
        resolve(result)
      })
    })
  }
  tail (o) {
    return new Promise((resolve, reject) => {
      if (o && o.path && o.size) {
        let poolPath = path.resolve(this.path, o.path)
        let filePath = path.resolve(poolPath, "tape.txt")
        let readStream = fs.createReadStream(filePath);
        let rl = readline.createInterface(readStream, new Stream);
        let cache = []
        rl.on('close', () => {
          // use currentLine here
          let promises = cache.map((c) => {
            return new Promise((_resolve, _reject) => {
              let chunks = c.split(" ");
              let txid = chunks[1];
              let res = this.readPromise({ key: o.path, path: poolPath }, txid)
              _resolve(res)
            })
          })
          Promise.all(promises).then(resolve)
        });
        rl.on('line', (line) => {
          cache.push(line);
          if (cache.length > o.size) {
            cache.shift();
          }
        });
      } else {
        throw new Error("The head query must contain 'path' and 'size' attributes")
      }
    })
  }
  async get (o) {
    /**************************************
    *
    *  o := {
    *    path: <overpool path>,
    *    hash: <transaction id>
    *  }
    *
    **************************************/
    if (o && o.hash && o.path) {
      let poolPath = path.resolve(this.path, o.path)
      let filePath = path.resolve(poolPath, o.hash)
      let res = await fs.promises.readFile(filePath, "utf8").catch((e) => {
        throw new Error("The file doesn't exist")
      })
      return res;
    } else {
      throw new Error("The get query must contain 'hash' and 'path' attributes")
    }
  }
}
module.exports = Overpool

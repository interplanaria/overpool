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
    this.tailOptions = Object.assign({ usePolling: true }, (o && o.tail ? o.tail : {}));
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
        if (!fs.existsSync(store)) {
          fs.mkdirSync(store, { recursive: true })
        }
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
  async pub (o) {
    if (o && o.path) {
      let discoveryKey;
      if (o.topic) {
        discoveryKey = await this.join(this.path + "/" + o.path + "/" + o.topic)
      } else {
        discoveryKey = await this.join(this.path + "/" + o.path)
      }
      this.publicKey = discoveryKey
      return discoveryKey;
    } else {
      throw new Error("Must specify path")
    }
  }
  async sub (o) {
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
      console.log(this.path, poolPath)
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
                  reject({ payment: payment, memo: "Unsupported transaction type", error: 1 })
                } else {
                  try {
                    this._post({ hash: hash, payment: payment, path: type, topic: o.topic }).then((response) => {
                      resolve({ payment: payment, memo: response.memo, error: response.error })
                    })
                  } catch (e) {
                    reject({ payment: payment, error: e })
                  }
                }
              })
            } else {
              this._post({ hash: hash, payment: payment, path: type, topic: o.topic }).then((response) => {
                resolve({ payment: payment, memo: response.memo, error: response.error })
              })
            }
          } else {
            reject({ payment: payment, memo: "Invalid Transaction", error: 1 })
          }
        })
        .catch((e) => {
          reject({ payment: payment, memo: e, error: 1 })
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
      let globalTapePath = path.resolve(poolPath, "tape.txt")
      let d = Date.now()
      if (o.topic) {
        // global tape
        let line = "OVERPOOL " + o.topic + "/" + o.hash + " " + d + "\n"
        await fs.promises.appendFile(globalTapePath, line);
        // topic tape
        let topicPath = path.resolve(poolPath, o.topic)
        if (!fs.existsSync(topicPath)) {
          fs.mkdirSync(topicPath, { recursive: true })
        }
        line = "OVERPOOL " + o.hash + " " + d + "\n"
        let localTapePath = path.resolve(topicPath, "tape.txt");
        await fs.promises.appendFile(localTapePath, line);
        // write tx to file
        let filePath = path.resolve(topicPath, o.hash)
        await fs.promises.writeFile(filePath, JSON.stringify(o.payment))
      } else {
        let filePath = path.resolve(poolPath, o.hash)
        await fs.promises.writeFile(filePath, JSON.stringify(o.payment))
        let line = "OVERPOOL " + o.hash + " " + d + "\n"
        await fs.promises.appendFile(globalTapePath, line);
      }
      return { memo: "success", error: 0 }
    } else {
      return { memo: "The post object must contain three attributes: hash, payment, and path", error: 1 }
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
  monitor (p, handler) {
    if (!this.tails[p.path]) {
      let tail;
      let _path = p.path;
      if (p.topic) {
        _path += ("/" + p.topic)
      }
      if (!fs.existsSync(_path)) {
        fs.mkdirSync(_path, { recursive: true })
      }
      try {
        if (!fs.existsSync(_path + "/tape.txt")) {
          fs.closeSync(fs.openSync(_path + "/tape.txt", 'w'));
        }
        tail = new Tail(_path + "/tape.txt", this.tailOptions)
      } catch (e) {
        fs.closeSync(fs.openSync(_path + "/tape.txt", 'w'));
        tail = new Tail(_path + "/tape.txt", this.tailOptions)
      }
      this.tails[_path] = tail
      tail.on("line", (data) => {
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
      tail.watch()
    }
  }
  on (e, handler) {
    //if (e === 'tx') {
    if (e.startsWith('tx')) {
      if (e === 'tx') {
        this.subscribed.forEach((p) => {
          this.monitor(p, handler)
        })
      } else {
        let tokens = e.split(":")
        if (tokens.length > 2) {
          let path = this.path + "/" + tokens[1];
          let topic = tokens[2];
          this.monitor({ key: path, path: path, topic: topic }, handler)
        } else if (tokens.length > 1) {
          let path = this.path + "/" + tokens[1];
          this.monitor({ key: path, path: path }, handler)
        }
      }
    }
    return this;
  }
  read (p, hash, handler) {
    let _path = p.path;
    if (p.topic) {
      _path += ("/" + p.topic)
    }
    if (fs.existsSync(_path + "/" + hash)) {
      fs.readFile(_path + "/" + hash, "utf8", async (err, content) => {
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
        let ev = {
          path: p.key,
          key: p.key,
          hash: hash,
          payment: JSON.parse(content),
          parsed: parsed
        }
        if (p.topic) ev.topic = p.topic;
        handler(ev)
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
  get (o) {
    return new Promise((resolve, reject) => {
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
        try {
          this.read ({ key: o.path, path: poolPath }, o.hash, (result) => {
            resolve(result)
          })
        } catch (e) {
          reject("The file doesn't exist")
        }
      } else {
        throw new Error("The get query must contain 'hash' and 'path' attributes")
      }
    })
  }
}
module.exports = Overpool

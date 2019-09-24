# Basic Server/Client Demo

This demo shows how you can start an Overpool server, and then make a POST request to the endpoint to write to the ledger.

## 1. Start the server

Start the Overpools server.

```
node server
```

## 2. Run the client

Then make a POST request to `localhost` endpoint

```
node client Hello World
```

This will create an `OP_RETURN` transaction with the "Hello" as the first pushdata and "World" as the second pushdata.

## 3. Check the overpool folder

If everything went correctly, you'll see that a new folder `overpool` has appeared. Also under the folder you'll see another folder named `localhost`.

This was because the server code specified the path to point to `localhost`:

```
pool.start({
  path: "localhost"
})
```

## 4. Keep adding more

Try adding more to the ledger. You'll see that the ledger keeps growing.

```
node client Hi World
node client abc def
node client testing testing
```

## 5. Prune

Try pruning the pool.

```
node prune
```

When you prune, the `tape.txt` will be renamed to `tape-<timestamp>.txt`, and the `tape.txt` itself will become empty, like this:

```
$ ls overpool/localhost/
1c76c406cf8862d7dac052ca92b03db6558d704c972e0e8bb5d220c8c00eec66
4b3fa2307a7d80ba0ba0b90ed9d26412a5c315f9ed0f0861619cf085ae308d31
510c39581b82842f75fb2802038ee93b582f27fe66bcee16b9bccbf6343b6c7d
53cf22658de8236fca2858190b5d973b88aca95b3af5d8cb6d63b2eac7b042a7
8e62df88ba08f5a05ebc5b480e9b04f6a973193c2876d93644234bff4ca4185a
96c3da724c032ccd41376683ecc88b1d1a49e06b1eceb7a0cb5e6466dd81c9a9
a16e2fa9e7a7cc18115c45d953ea4aa872b5c532624cf1075180c79d8850df91
dbd1ddefdd2f334c9b2ee139001f9cf6e97b875720dda03b6250530201d3c50c
e261a50aebce74638c30004f4b02e8d54e0f3b56b8dbba6c9697ac139f7a429c
e7c6413daf7ecc3e6a0eb73fc283e171703a94878c134bfe02363c754b6fb310
tape-1569221161576.txt
tape.txt
```

If you look inside `tape.txt`, you'll notice that it's empty now. And the `tape-1569221161576.txt` file will have the pruned transaction log.

To delete the actual transactions, you must delete them separately.

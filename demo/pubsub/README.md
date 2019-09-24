# Pubsub Example

In this example, we will publish a pool, and then subscribe to it over the P2P network.

## 1. Publish

Run the following command in this folder:

```
node pub.js
```

The `pub.js` looks like this:

```
const Overpool = require('../../index')
const pool = new Overpool();
(async () => {
  pool.start({ path: "localhost" })
  let key = await pool.pub({
    path: "localhost"
  });
  console.log("key = ", key)
  pool.on("tx", (e) => {
    console.log(e)
  })
})();
```

Here's what's going on:

1. start the pool: `pool.start()`
2. publish the pool: `pool.pub()` and `await` for the discovery key `key`.
3. Print the key, so we can share the pool with 3rd parties
4. Start listening to events with `pool.on()`.

Running the code will give you something like this (Note that the key will look different since it's always uniquely generated):

```
$ node pub.js
key =  c01929a4b632e6540b62b37977ed2de90189bd70c65d6af9ec8f40b5eb4835da
```


## 2. Subscribe from Local

Now that we have the key, we can discover the pool over DHT (Distributed Hash Table) and replicate over DAT network with the discovery key.

From the same machine, try running the following. It will start a subscriber pool.

> ** REMEMBER TO USE YOUR OWN GENERATED KEY FROM ABOVE**

```
node sub c01929a4b632e6540b62b37977ed2de90189bd70c65d6af9ec8f40b5eb4835da
```

## 3. Post

Now that we have everything set up, let's try posting to the published `localhost` pool.

Make sure to keep both the publish pool (`localhost`) and the peer subscriber pool open (`c01929a4b632e6540b62b37977ed2de90189bd70c65d6af9ec8f40b5eb4835da`) before you run this:

```
node client hello world
```

This will generate a transaction that encodes the "hello" and "world" as an OP_RETURN push data and post it to the `localhost` overpool endpoint.

You will immediately see the event handlers for `pub` and `sub` apps react, and they will print the payload.

Also, check the `overpool` folder to make sure everything is synchronized (They should be, since the events are always triggered FROM the file, instead of the other way around).

## 4. Subscribe from Remote

If you have another machine, let's try subscribing from another machine.

Go to another machine and run the same sub code:

```
node sub c01929a4b632e6540b62b37977ed2de90189bd70c65d6af9ec8f40b5eb4835da
```

> ** REMEMBER TO USE YOUR OWN GENERATED KEY FROM ABOVE**

You will see that it works exactly the same as the local subscriber pool. Assuming that you have all 3 pools running at this point (The publisher `localhost` pool, the local subscriber pool, and the remote subscriber pool), here's what is exactly going on:

1. You post a transaction to the publisher pool.
2. The transaction gets stored on the publisher pool ledger as a file.
3. This automatically notifies all peers (both local and remote) via DAT protocol and automatically synchronizes.
4. All of the pool apps contain an event handler logic `pool.on("tx", ...)` therefore they will trigger events which you can programmatically process.

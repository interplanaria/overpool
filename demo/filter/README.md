# Filtered Pool

By default all pools accept any form of transactions as long as they are encoded correctly.

This even includes unsigned transactions (Which can be very powerful depending on how you use it).


But often you will want to restrict the transactions based on various patterns. For example, you may not want random transactions which have nothing to do with your app to be stored on your Overpool.

This is where filters come in. You simply define a filter function which either passes or fails, and Overpool will only take transactions that fit your criteria.

The filter automatically deserializes the raw transaction into a [BOB Format](https://medium.com/@_unwriter/hello-bob-94701d278afb), powered by [BPU](https://github.com/interplanaria/bpu). From here you just need to write a conditional statement and return with a callback.


## 1. Start a Filtered Pool

Let's try starting a filtered pool.

```
node server
```

If you look into the code, you'll see that it checks for the protocol push data to be `19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut`. It rejects all other types of transactions, following the [BIP270](https://github.com/moneybutton/bips/blob/master/bip-0270.mediawiki) response format.


## 2. Make a client request

Now lets try making a random request to the server:

```
node client abc def
```

This will create a transaction which contains `abc` and `def` as the OP_RETURN pushdata. Obviously this doesn't pass the test, since it needs to contain `19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut`.

You will see that nothing happens.

Now let's try posting a transaction which passes the test

```
node client 19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut abc
```

This passes the test so you'll see that it gets stored inside the `filtered_pool` overpool, and triggers an event.

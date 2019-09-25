# get

This example uses the `get` API.

You must pass one object argument which contains two attributes:

- `path`: The overpool path
- `hash`: The transaction id (hash)

To run:

```
node index
```

It will iterate through 10 loops to create transactions while incrementing pushdata.

And then for each `tx` event (`pool.on("tx")`), it compares the actual event with the queried result `await pool.get()`

# Fibonacci over Bitcoin

This app iteratively creates a fibonacci sequence over Overpool.

![fibonacci](fibonacci.gif)

Just run:

```
node fibonacci
```

1. It uses the `tail` API to get the last 2 items on the tape.
2. Then it adds the fibonacci part of the transaction together to create a new Bitcoin transaction
3. Then it submits to Overpool.
4. Overpool triggers another event subsequently, and the logic goes back to step 1.
5. This continues for 100 times and halts.

This is just the most primitive example, you can imagine there are many applications for this.

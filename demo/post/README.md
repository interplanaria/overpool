# post

The `post` API lets you directly submit to Overpool, programmatically.

Instead of making an HTTP POST request, it uses the internal post API to directly write to the ledger.

Just like with the HTTP approach, the "filter" still applies. Therefore if you try to submit invalid transactions which your filter is programmed to reject, you will get a `PaymentACK` reject error.

This folder contains two cases:

1. **Correct:** Correct transaction which passes the filter
2. **Incorrect:** An incorrect transaction which gets rejected by the filter.

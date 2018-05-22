# BigchainDB tips'n'tricks

## Make a statement
A statement is a `CREATE` transaction that is recorded to the blockchain and cannot be transferred. It can be used to timestamp events.

```python
transaction = bdb.transactions.prepare(
    operation='CREATE',
    signers=alice.public_key,
    asset={'data': {'statement': 'Today is a sunny day in Berlin'}}
)
transaction['outputs'] = []

bdb.transactions.send(
    bdb.transactions.fulfill(transaction, private_keys=alice.private_key))
```

## Using a public key as a topic
A public key is nothing more than 32 bytes. Any combination of these 32 bytes can be converted to a public key. The output size of the hashing algorithm `SHA3-256` is 32 bytes as well: we can take any arbitrary object and use its hash as a public key, with no one being able to recover the associated private key (this is a property of asymmetric encryption). By hashing strings we can create a simple and efficient system to post transactions to a "topic".

I'll start with a couple of examples.

### Build a twitter clone
Note: this example skips big intermediate steps to create an identity to attach data on it, and being able to follow other users in the system.

Imagine a tool called `detweet` to post on a decentralized twitter running on BigchainDB. It looks something like this:
```
$ detweet "#Berlin is beautiful when the Sun is out. #spring #weather"
```

What is happening under the hood is the following:
1. Put all hashtags in the message in the `H` list.
2. For each hashtag in the `H` list calculate `sha3_256("decentralized-twitter:" + hashtag.lower())`, and put it in the list `L`
3. Create a transaction with amount `len(L)`, and transfer one token per public key in `L` (remember, a public key is just 32 bytes).

To retrieve all tweets with hashtag `spring`, type:
```
$ detweet search "#spring"

...
vrde> #Berlin is beautiful when the Sun is out. #spring #weather
...
```

The subcommand `hashtag` querys the [`outputs?public_key={public_key}`][bdb:unspent] API endpoint using as `public_key` the result of: `sha3_256("decentralized-twitter:" + hashtag.lower())`. If multiple hashtags are used, then `detweet` makes multiple searches  and combines the results.

To make things more interesting, the [`outputs?public_key={public_key}`][bdb:unspent] endpoint can be extended with the new parameter `owners_before`. This would allow to restrict the search by including **only** a specific set of public keys, and showing only results from the *following* list of the user:
```
$ detweet search "#spring source:follow"

...
vrde> #Berlin is beautiful when the Sun is out. #spring #weather
...
```

The filter `source:follow` expands to the list of keys the user follows. This list is then used in `outputs?public_key={hash("spring")}&owners_before={follows list}`.

[bdb:unspent]: https://docs.bigchaindb.com/projects/server/en/latest/http-client-server-api.html#get--api-v1-outputs?public_key=public_key&spent=false

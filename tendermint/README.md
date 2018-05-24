# Know what your node is doing
The following commands that can help troubleshooting common issues with Tendermint. They require `jq`, a command line JSON processor, that you can install with:
```
sudo apt install jq
```

## Problem: I don't know if my node is connected to the network
When you add your node to the network, it will connect to a subset of nodes. To find out which ones, run:
```
curl -s localhost:46657/net_info | jq ".result.peers[].node_info | {id, listen_addr, moniker}"
```

## Problem: the network is stuck and does not accept new transactions
Maybe there are not enough pre-votes or pre-commits to reach consensus. This happens when less than ⅔ of the network is online.

Run the command:
```
curl -s localhost:46657/dump_consensus_state | jq ".result.round_state.votes"
```
You should see two keys: `prevotes` and `precommits`. The first stage to reach consensus is to vote (`prevote`) on the current round, the second stage is to commit (`precommit`) the block. The majority of the network needs to reach consensus on both steps to commit the block and move to the next one. If one (or both) of `prevotes` and `precommits` has less than ⅔ votes, the network is stuck and will wait for new nodes to come online and vote.

Even if the network seems to not be responsive, transactions are stored in the mempool and put into the blockchain once the networ is able to reach consensus. You can check it by running:
```
curl -s http://localhost:46657/num_unconfirmed_txs | jq .result
```

If this is the situation you are in, you need to talk to the other Members of the Network and make sure they come back online. To mitigate the issue in the future, make sure everyone is starting BigchainDB and Tendermint on boot of their machine. Also, a larger network can help.

# How to import a Validator key pair

The script [use_keys.py](use_keys.py) loads signing and verifying key from `priv_validator.json`, and uses them to sign and verify a message.

Details about the encodings used by Tendermint can be found in their [specification document](https://github.com/tendermint/tendermint/blob/master/docs/spec/blockchain/encoding.md), together with the [list of all possible encodings](https://github.com/tendermint/go-crypto#json-encoding)

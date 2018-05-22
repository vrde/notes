# How to import a Validator key pair

The script [use_keys.py](use_keys.py) loads signing and verifying key from `priv_validator.json`, and uses them to sign and verify a message.

Details about the encodings used by Tendermint can be found in their [specification document](https://github.com/tendermint/tendermint/blob/master/docs/spec/blockchain/encoding.md), together with the [list of all possible encodings](https://github.com/tendermint/go-crypto#json-encoding)

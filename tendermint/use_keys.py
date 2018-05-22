import json
from base64 import b64decode

from nacl import signing


priv_val = json.load(open('priv_validator.json'))

# The *amino type* 954568A3288910 is 64 bytes long, where
# raw 32-byte priv key are concatenated to raw 32-byte pub key.
raw_key = b64decode(priv_val['priv_key']['value'])
signing_key_bytes, verifying_key_bytes = raw_key[:32], raw_key[32:]

signing_key = signing.SigningKey(signing_key_bytes)
verify_key = signing.VerifyKey(verifying_key_bytes)

signed = signing_key.sign(b'I love cats.')

# Will raise nacl.exceptions.BadSignatureError if the signature check fails
verify_key.verify(signed)

# The following code will raise the exception.
# signing.VerifyKey(verifying_key_bytes[:31] + b'\x00').verify(signed)

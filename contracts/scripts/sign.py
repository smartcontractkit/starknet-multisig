from starkware.crypto.signature.signature import (
    pedersen_hash, private_to_stark_key, sign)
private_key = 123456
public_key = private_to_stark_key(private_key)

message_hash = pedersen_hash(0, 0)
#message_hash = pedersen_hash(message_hash4, 123)

signature = sign(
    msg_hash=message_hash, priv_key=private_key)
print(f'Public key: {public_key}')
print(f'Signature: {signature}')
print(f'Message hash: {message_hash}')
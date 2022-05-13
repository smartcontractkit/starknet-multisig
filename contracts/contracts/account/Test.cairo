# SPDX-License-Identifier: MIT
# OpenZeppelin Contracts for Cairo v0.1.0 (account/Account.cairo)

%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin, SignatureBuiltin
from starkware.starknet.common.syscalls import get_contract_address
from starkware.cairo.common.hash import hash2
from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.signature import verify_ecdsa_signature


@view
func gethash{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*,
    range_check_ptr}() -> (res : felt):

    alloc_locals
    let (hashval) = hash2{hash_ptr=pedersen_ptr}(0, 10)
    # let (hashval2) = hash2{hash_ptr=pedersen_ptr}(hashval, 1)
    # let (hashval3) = hash2{hash_ptr=pedersen_ptr}(hashval2, 2)
    # let (hashval4) = hash2{hash_ptr=pedersen_ptr}(hashval3, 3)
    # let (hashval5) = hash2{hash_ptr=pedersen_ptr}(hashval4, 2)
    # let (hashval6) = hash2{hash_ptr=pedersen_ptr}(hashval5, 4)
    # let (hashval7) = hash2{hash_ptr=pedersen_ptr}(hashval6, 5)
    # let (hashval8) = hash2{hash_ptr=pedersen_ptr}(hashval7, 6)
    # let (hashval9) = hash2{hash_ptr=pedersen_ptr}(hashval8, 7)

    return (hashval)
end

# Custom logic

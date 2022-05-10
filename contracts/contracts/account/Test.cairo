# SPDX-License-Identifier: MIT
# OpenZeppelin Contracts for Cairo v0.1.0 (account/Account.cairo)

%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin, SignatureBuiltin
from starkware.starknet.common.syscalls import get_contract_address
from starkware.cairo.common.hash import hash2
from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.signature import verify_ecdsa_signature
from account.library import (
    AccountCallArray,
    Account_execute,
    Account_get_nonce,
    Account_initializer,
    Account_get_public_key,
    Account_set_public_key,
    Account_is_valid_signature
)

from account.ERC165 import ERC165_supports_interface 

from account.multisig_library import (
    Transaction,
    multisig_is_owner,
    multisig_get_owners_len,
    multisig_get_owners,
    multisig_get_transactions_len,
    multisig_get_confirmations_required,
    multisig_is_confirmed,
    multisig_is_executed,
    multisig_get_transaction,
    multisig_initializer,
    multisig_submit_transaction,
    multisig_confirm_transaction,
    multisig_revoke_confirmation,
    multisig_execute_transaction
)

#
# Getters
#

@view
func get_public_key{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (res: felt):
    let (res) = Account_get_public_key()
    return (res=res)
end

@view
func get_nonce{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (res: felt):
    let (res) = Account_get_nonce()
    return (res=res)
end

@view
func supportsInterface{
        syscall_ptr: felt*, 
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    } (interfaceId: felt) -> (success: felt):
    let (success) = ERC165_supports_interface(interfaceId)
    return (success)
end

#
# Setters
#

@external
func set_public_key{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(new_public_key: felt):
    Account_set_public_key(new_public_key)
    return ()
end

#
# Constructor
#

@constructor
func constructor{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(
        owners_len : felt,
        owners : felt*,
        confirmations_required : felt):
    Account_initializer()
    multisig_initializer(owners_len, owners, confirmations_required)
    return ()
end

#
# Business logic
#

@view
func is_valid_signature{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr, 
        ecdsa_ptr: SignatureBuiltin*
    }(
        hash: felt,
        signature_len: felt,
        signature: felt*
    ) -> ():
    Account_is_valid_signature(hash, signature_len, signature)
    return ()
end

@external
func doo{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr, 
        ecdsa_ptr: SignatureBuiltin*
    }(
        call_array_len: felt,
        call_array: AccountCallArray*,
        calldata_len: felt,
        calldata: felt*,
        user: felt,
        sig : (felt, felt)
    ) -> ():

    alloc_locals 
    let hashval3 : felt =      _get_calldata_hash(calldata_len - 1, calldata_len, calldata)

    verify_ecdsa_signature(
        message=hashval3,
        public_key=user,
        signature_r=sig[0],
        signature_s=sig[1],
    )

    return ()
end

func _get_calldata_hash{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(
        calldata_index : felt,
        calldata_len : felt,
        calldata : felt*
    ) -> (res : felt):
    alloc_locals

    if calldata_index == 0:
        let (hashval2) = hash2{hash_ptr=pedersen_ptr}(0, calldata[calldata_index])
         return (hashval2)
    end

    let currHash : felt = _get_calldata_hash(calldata_index - 1, calldata_len, calldata)
    let (hashval) = hash2{hash_ptr=pedersen_ptr}(currHash, calldata[calldata_index])

    return (hashval)
end

# Custom logic


@view
func get_transactions_len{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (res : felt):
    let (res) = multisig_get_transactions_len()
    return (res)
end

@external
func submit_transaction{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(
        to : felt,
        function_selector : felt,
        calldata_len : felt,
        calldata : felt*):
    multisig_submit_transaction(to, function_selector, calldata_len, calldata)
    return ()
end

# TODO: add more logic from multisig
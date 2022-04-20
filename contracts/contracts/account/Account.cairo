# SPDX-License-Identifier: MIT
# OpenZeppelin Contracts for Cairo v0.1.0 (account/Account.cairo)

%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin, SignatureBuiltin
from starkware.starknet.common.syscalls import get_contract_address
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


# TODO: add getters from multisig

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
        public_key: felt,
        owners_len : felt,
        owners : felt*,
        confirmations_required : felt):
    Account_initializer(public_key)
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
func __execute__{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr, 
        ecdsa_ptr: SignatureBuiltin*
    }(
        call_array_len: felt,
        call_array: AccountCallArray*,
        calldata_len: felt,
        calldata: felt*,
        nonce: felt
    ) -> (response_len: felt, response: felt*):

    with_attr error_message("Account: only single call allowed (for now)"):
        assert call_array_len = 1
    end

    let (self) = get_contract_address()

    # External calls have to go through multisig_execute_transaction
    #with_attr error_message("Account: only internal calls are allowed"):
    #    assert [call_array].to = self
    #end

    let (response_len, response) = Account_execute(
        call_array_len,
        call_array,
        calldata_len,
        calldata,
        nonce
    )
    return (response_len=response_len, response=response)
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
    }(to : felt,
        function_selector : felt,
        calldata_len : felt,
        calldata : felt*):
    multisig_submit_transaction(to, function_selector, calldata_len, calldata)
    return ()
end
# Some temporary developer notes

## Current status:

contracts/account/Account.cairo might already be a working account contract multisig. It has signatures and nonce checks commented out, but otherwise at least transaction submission works.

Testing it further hasn't been done because some underlying libraries have bugs (https://github.com/0xs34n/starknet.js/issues/164).

It's also missing view functions (the functions are there but they haven't been exposed).

## Helpful commands for testing stuff from command line

Deploy multisig account contract: `npx hardhat starknet-deploy --starknet-network devnet ./starknet-artifacts/contracts/account/Account.cairo --inputs "1 1 0x011833a87cdffb58c2bde4af8708f16c744656666ff97506fd302a7bbd56d27f 1" --wait`. The parameters are rubbish currently.

Deploy target mock contract: `npx hardhat starknet-deploy --starknet-network devnet ./starknet-artifacts/contracts/multisig/mock/Target.cairo --wait`

Create a transaction in deployed account contract multisig: `npx hardhat starknet-invoke --starknet-network devnet --contract account/Account --address 0x024e463414cadcd4201957eb4b9102a73584d26af6b8ae529706018c2eb81a05 --function __execute__ --inputs "1 1042924294570447457170769935612291103821989112791663729009525620681234455045 335738064830050482557490737137157474610073258793746549206815859708608826465 0 1 1 6 0" --wait`. The parameters need to be adjusted.

## Function selectors:

`multisig_submit_transaction`: 335738064830050482557490737137157474610073258793746549206815859708608826465

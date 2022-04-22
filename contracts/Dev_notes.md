# Some temporary developer notes

## Current status:

Unfortunately there's no way to use custom account contracts (either in Hardhat or barebones starknet CLI) because signed messages are supported only for precompiled account contracts (OZ + Argent). So we currently try to use it directly by calling `__execute__` manually.

It's also missing view functions (the functions are there but they haven't been exposed).

Signer signature verifications are currently disabled (for the `submit_transaction` endpoint at least) because signature verification (and its structure) isn't working currently - probably user error. Furthermore, the `Account` constructor probably shouldn't take in a public key, since the contract shouldn't act as a regular account contract - only as a multisig one. Quite some work to do still.

The unit tests are a mess, mostly disabled, due to testing various signature-related things.

## Helpful commands for testing stuff from command line

Deploy multisig account contract: `npx hardhat starknet-deploy --starknet-network devnet ./starknet-artifacts/contracts/account/Account.cairo --inputs "1 1 0x011833a87cdffb58c2bde4af8708f16c744656666ff97506fd302a7bbd56d27f 1" --wait`. The parameters are rubbish currently.

Deploy target mock contract: `npx hardhat starknet-deploy --starknet-network devnet ./starknet-artifacts/contracts/multisig/mock/Target.cairo --wait`

Create a transaction in deployed account contract multisig: `npx hardhat starknet-invoke --starknet-network devnet --contract account/Account --address 0x024e463414cadcd4201957eb4b9102a73584d26af6b8ae529706018c2eb81a05 --function __execute__ --inputs "1 1042924294570447457170769935612291103821989112791663729009525620681234455045 335738064830050482557490737137157474610073258793746549206815859708608826465 0 1 1 6 0" --wait`. The parameters need to be adjusted.

## Function selectors:

`multisig_submit_transaction`: 335738064830050482557490737137157474610073258793746549206815859708608826465

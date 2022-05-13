import { expect } from "chai";
import { assert } from "console";
import { BigNumber, ethers } from "ethers";
import { starknet } from "hardhat";
import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types/runtime";
import {
  Contract,
  defaultProvider,
  ec,
  json,
  number,
  Provider,
  stark,
  hash,
  Signer,
  Invocation,
} from "starknet";
import { transformCallsToMulticallArrays } from "starknet/dist/utils/transaction";
import { getSelectorFromName } from "starknet/dist/utils/hash";
import fs from "fs";
//import { InvokeOptions } from "@shardlabs/starknet-hardhat-plugin/dist/types";
import * as starkwareCrypto from "@toruslabs/starkware-crypto";

describe("Multisig with single owner", function () {
  this.timeout(3000_000);

  before(async function () {
    /*
      1. generate keypair
      2. get its private and public key
      3. generate a new keypair using the private key
      4. Verify that the public key from the new keypair is the same as the originally generated keypair's - basically means the new keypair is the same as the already generated one
    */
    const gen = (index: number) => {
      const starkKeyPair = ec.genKeyPair();
      const starkKeyPub = ec.getStarkKey(starkKeyPair);
      const starkKeyPriv = starkKeyPair.getPrivate().toString();

      // Verify: use the private key to generate public key
      const newPair = ec.getKeyPair(starkKeyPriv);
      const newPub = ec.getStarkKey(newPair);

      if (newPub != starkKeyPub) {
        throw "Problems";
      }

      console.log(
        "Key " + index + ": ",
        "private key: " + starkKeyPriv,
        "public key: " + starkKeyPub
      );
    };
    for (let i = 0; i < 7; i++) {
      gen(i);
    }

    /* const messageHash = starkwareCrypto.pedersen(["0", "8"]);

    const kp = starkwareCrypto.ec.keyFromPrivate([12345]);
    const publicKey = ec.getStarkKey(kp);
    const signature = ec.sign(kp, messageHash);

    await starknet.devnet.restart();

    console.log("Deployment Tx - Account Contract to StarkNet...");

    const targetContractFactory = await starknet.getContractFactory(
      "contracts/multisig/mock/Target"
    );
    const targetContract = await targetContractFactory.deploy(
      {},
      { salt: "0x1" }
    );

    console.log("target adddress", targetContract.address);

    const accountContractFactory = await starknet.getContractFactory(
      "contracts/account/Account"
    );
    const accountContract = await accountContractFactory.deploy(
      {
        owners: [number.toBN(publicKey)],
        confirmations_required: 1,
      },
      { salt: "0x1" }
    );
    //
    console.log("Deployed account at ", accountContract.address);

    const innerCalldata = [
      number.toBN(targetContract.address),
      number.toBN(getSelectorFromName("set_balance")),
      1,
      8,
      number.toBN(publicKey),
      number.toBN(signature[0]),
      number.toBN(signature[1]),
    ];

    const calldata = {
      call_array: [
        {
          to: number.toBN(accountContract.address),
          selector: number.toBN(getSelectorFromName("submit_transaction")),
          data_offset: 0,
          data_len: innerCalldata.length,
        },
      ],
      calldata: innerCalldata,
      nonce: 0,
    };

    const txhash = await accountContract.invoke("__execute__", calldata);
    console.log("real hash", txhash); */
  });

  describe(" - submit - ", function () {
    it("transaction submit works", async function () {});
  });
});

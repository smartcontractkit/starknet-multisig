import { expect } from "chai";
import { assert } from "console";
import { BigNumber } from "ethers";
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
    const messageHash = starkwareCrypto.pedersen(["0", "8"]);

    const kp = starkwareCrypto.ec.keyFromPrivate([12345]);
    const publicKey = ec.getStarkKey(kp);
    const signature = ec.sign(kp, messageHash);

    console.log("Deployment Tx - Account Contract to StarkNet...");

    const accountContractFactory = await starknet.getContractFactory(
      "contracts/account/Account"
    );
    const accountContract = await accountContractFactory.deploy({
      owners: [number.toBN(publicKey)],
      confirmations_required: 1,
    });
    //
    console.log("Deployed account at ", accountContract.address);

    const calldata = {
      call_array: [
        {
          to: number.toBN(accountContract.address),
          selector: number.toBN(getSelectorFromName("submit_transaction")),
          data_offset: 0,
          data_len: 7,
        },
      ],
      calldata: [
        number.toBN(
          "0x03af8252c614c634b9ac563745dbff4b102cbda0fc867ae54cc55348c4892bba"
        ),
        number.toBN(getSelectorFromName("set_balance")),
        1,
        8,
        number.toBN(publicKey),
        number.toBN(signature[0]),
        number.toBN(signature[1]),
      ],
      nonce: 0,
    };

    await accountContract.invoke("__execute__", calldata);
  });

  describe(" - submit - ", function () {
    it("transaction submit works", async function () {});
  });
});

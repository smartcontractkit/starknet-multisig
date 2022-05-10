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
import { InvokeOptions } from "@shardlabs/starknet-hardhat-plugin/dist/types";
import * as starkwareCrypto from "@toruslabs/starkware-crypto";

describe("Multisig with single owner", function () {
  this.timeout(3000_000);

  let acc: Contract;

  const starkKeyPair = ec.genKeyPair();
  const starkKeyPub = ec.getStarkKey(starkKeyPair);

  before(async function () {
    const compiledAccount = json.parse(
      fs
        .readFileSync(
          "./starknet-artifacts/contracts/account/Account.cairo/Account.json"
        )
        .toString("ascii")
    );

    console.log("Deployment Tx - Account Contract to StarkNet...");

    const provider = new Provider({
      baseUrl: "http://alpha4.starknet.io",
      feederGatewayUrl: "feeder_gateway",
      gatewayUrl: "gateway",
    });

    console.log("start deploy");

    const accountContractFactory = await starknet.getContractFactory(
      "contracts/account/Account"
    );
    const accountContract = await accountContractFactory.deploy({
      owners: [starkKeyPub],
      confirmations_required: 1,
    });
    const signer = new Signer(starkKeyPair);

    const calldata = {
      user: starkKeyPub, //"1628448741648245036800002906075225705100596136133912895015035902954123957052",
      //  amount: "4321",
      //  sig1: "1225578735933442828068102633747590437426782890965066746429241472187377583468",
      //  sig2: "3568809569741913715045370357918125425757114920266578211811626257903121825123",
    };
    var inv: Invocation = {
      contractAddress: accountContract.address,
      entrypoint: "doit",
      //calldata:
    };
    /*     signer.signTransaction(
       [inv], 

    }) */

    //await accountContract.invoke("doit", {});
    await accountContract.invoke("doit", calldata);

    /*     const accountResponse = await provider.deployContract({
      constructorCalldata: [1, starkKeyPub, 1],
      contract: compiledAccount,
      addressSalt: starkKeyPub,
    });
    console.log("wait deploy");

    await provider.waitForTransaction(accountResponse.transaction_hash); */
    /*     acc = new Contract(
      compiledAccount.abi,
      accountResponse.address ?? "",
      provider
    ); 
    
        const { transaction_hash: transferTxHash } = await acc.__execute__();
        await defaultProvider.waitForTransaction(transferTxHash);
        */
  });

  describe(" - submit - ", function () {
    it("transaction submit works", async function () {});
  });
});

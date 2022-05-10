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
} from "starknet";
import { transformCallsToMulticallArrays } from "starknet/dist/utils/transaction";
import { getSelectorFromName } from "starknet/dist/utils/hash";
import fs from "fs";
import { InvokeOptions } from "@shardlabs/starknet-hardhat-plugin/dist/types";
import * as starkwareCrypto from "@toruslabs/starkware-crypto";

describe("Multisig with single owner", function () {
  this.timeout(3000_000);

  let contractFactory: StarknetContractFactory;
  let targetContract: StarknetContract;
  let accountContract: StarknetContract;

  let account: Account;
  let acc: Contract;
  let nonOwner: Account;
  let accountAddress: string;
  /*   let privateKey: string;
  let publicKey: string; */

  let txIndex = -1; // faster to track this internally than to request from contract

  // be sure to pass big numbers as strings to avoid precision errors
  /*  const privateKey =
    "1628448741648245036800002906075225705100596136133912895015035902954123957123";
  const keyPair = starkwareCrypto.ec.keyFromPrivate(privateKey);
  const publicKey = starkwareCrypto.ec
    .keyFromPublic(keyPair.getPublic(true, "hex"), "hex")
    .getPublic()
    .getX()
    .toString(16);
  const publicKeyFelt = BigInt("0x" + publicKey); */

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const starkKeyPair = ec.genKeyPair();
  const starkKeyPub = ec.getStarkKey(starkKeyPair);

  // should be beforeeach, but that'd be horribly slow. Just remember that the tests are not idempotent
  before(async function () {
    const compiledAccount = json.parse(
      fs
        .readFileSync(
          "./starknet-artifacts/contracts/account/Account.cairo/Account.json"
        )
        .toString("ascii")
    );

    console.log("Deployment Tx - Account Contract to StarkNet...");

    /*   const provider = new Provider({
      baseUrl: "http://localhost:5000",
      feederGatewayUrl: "feeder_gateway",
      gatewayUrl: "gateway",
    }); */
    const provider = new Provider({
      baseUrl: "http://alpha4.starknet.io",
      feederGatewayUrl: "feeder_gateway",
      gatewayUrl: "gateway",
    });

    //const prov = new Provider()
    console.log("start deploy");
    const accountResponse = await provider.deployContract({
      //constructorCalldata: [number.toBN(publicKey), 1, 2, 1],
      constructorCalldata: [
        //number.toBN(publicKey),
        //starkKeyPub,
        1,
        //number.toBN(publicKey),
        starkKeyPub,
        1,
      ],
      contract: compiledAccount,
      addressSalt: starkKeyPub,
    });
    console.log("wait deploy");
    /*
    
    account = await starknet.deployAccount("OpenZeppelin");
    nonOwner = await starknet.deployAccount("OpenZeppelin");
*/
    //let exaccount = await starknet.deployAccount("OpenZeppelin");
    /*     console.log(
      "waiting for tx",
      accountResponse.transaction_hash,
      "for provider"
    );*/
    await provider.waitForTransaction(accountResponse.transaction_hash);
    acc = new Contract(
      compiledAccount.abi,
      accountResponse.address ?? "",
      provider
    );
    console.log("got acc");
    //  if (accountResponse.address) {
    //  acc = new Contract(compiledAccount.abi, accountResponse.address);
    /*  account = await starknet.getAccountFromAddress(
        accountResponse.address,
        number.toFelt(starkKeyPair.getPrivate()),
        "OpenZeppelin"
      ); */

    //accountAddress = accountResponse.address;
    /*       privateKey = account.privateKey;
      publicKey = account.publicKey; */

    /*       let multisigFactory = await starknet.getContractFactory("Multisig");
      multisig = await multisigFactory.deploy({
        owners: [number.toBN(accountAddress)],
        confirmations_required: 1,
      }); */

    /*     const accountContractFactory = await starknet.getContractFactory(
      "contracts/account/Account"
    );
    accountContract = await accountContractFactory.deploy({
      public_key: publicKeyFelt,
      owners: [publicKeyFelt],
      confirmations_required: 1,
    }); */

    /*
constructorCalldata: [number.toBN(starkKeyPub), 1, 2, 1],
      contract: compiledAccount,
      addressSalt: starkKeyPub,
      */
    const targetContractFactory = await starknet.getContractFactory(
      "contracts/multisig/mock/Target"
    );
    targetContract = await targetContractFactory.deploy();

    console.log("Deployed target contract at", targetContract.address);
    console.log(
      "Deployed acc contract at ",
      acc.address,
      accountResponse.address
    );
    //console.log("Deployed Account contract at", accountContract.address);
    /*       console.log(
        "Deployed account at address:",
        account.starknetContract.address
      ); */
    //}
  });

  describe(" - submit - ", function () {
    it("transaction submit works", async function () {
      txIndex++;

      const targetSelector = number.toBN(getSelectorFromName("set_balance"));
      const submitSelector = number.toBN(
        getSelectorFromName("submit_transaction")
      );
      console.log("target selector", targetSelector, targetSelector.toString());
      console.log("submit selector", submitSelector, submitSelector.toString());

      const targetContractNumber = number.toBN(targetContract.address);
      //const accountContractNumber = number.toBN(accountContract.address);

      /*   This is for trying to pretend that we use OZ, but this doesn't work
    const account = await starknet.getAccountFromAddress(
        accountContract.address,
        privateKey,
        "OpenZeppelin"
      );
      console.log("got account");
      await account.invoke(targetContract, "set_balance", { _balance: 76 });
 */
      /*       const calldata = [targetContractNumber, targetSelector, 1, 8];
      const callArray = {
        to: accountContractNumber,
        selector: submitSelector,
        data_offset: 0,
        data_len: calldata.length,
      };

      const fullParams = {
        call_array: [callArray],
        calldata: calldata,
        nonce: 0,
      }; */

      const calls = [
        {
          contractAddress: acc.address,
          entrypoint: "submit_transaction",
          calldata: [
            targetContractNumber.toString(),
            targetSelector.toString(),
            "1",
            "8",
          ],
        },
      ];
      console.log("starting hash");
      const msgHash = hash.hashMulticall(acc.address, calls, "0", "0");
      console.log("starting transform");
      const { callArray, calldata } = transformCallsToMulticallArrays(calls);
      console.log("got hash", msgHash);
      const signature = ec.sign(starkKeyPair, msgHash);
      console.log("signature", signature);
      /*        const messageHash = starkwareCrypto.pedersen([
        accountContractNumber.toString(),
        submitSelector.toString(),
        "0",
        calldata.length.toString(),
        targetContractNumber.toString(),
        targetSelector.toString(),
        "1",
        "8",
        "0",
        "0", // blind
      ]);  */
      //const signedMessage = starkwareCrypto.sign(keyPair, messageHash);
      /*       const signature = [
         BigInt("0x" + signedMessage.r.toString(16)),
        BigInt("0x" + signedMessage.s.toString(16)), 
      ];
      const stringed = signedMessage.map(s => number.toBN(s));
      console.log("using sign", signedMessage, stringed); */

      /*       const opts: InvokeOptions = {
        signature: stringed,
      };

      await accountContract.invoke("__execute__", fullParams, opts); */
      console.log("starting exec", callArray, calldata, signature);
      // await delay(20000);
      const { transaction_hash: transferTxHash } = await acc.__execute__(
        callArray,
        calldata,
        "0"
        //signature
      );
      await defaultProvider.waitForTransaction(transferTxHash);

      /*       console.log("invoked");
      const res = await targetContract.call("get_balance", {});
      console.log("resss", res, res.toString());
      console.log("res2", res.res, res.res.toString()); */

      //await account.invoke(multisig, "submit_transaction", payload);

      //const aa = await targetContract.call("get_balance", []);
      //console.log("bala", aa);
      /*    const res = await account.call(multisig, "get_transaction", {
        tx_index: txIndex,
      });

      expect(res.tx.to.toString()).to.equal(target.toString());
      expect(res.tx.function_selector.toString()).to.equal(selector.toString());
      expect(res.tx.calldata_len).to.equal(1n);
      expect(res.tx.executed).to.equal(0n);
      expect(res.tx.num_confirmations).to.equal(0n);
      expect(res.tx_calldata_len).to.equal(1n);
      expect(res.tx_calldata[0]).to.equal(5n); */
    });
    /* 
    it("transaction execute works", async function () {
      txIndex++;

      const payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      const bal = await targetContract.call("get_balance");
      expect(bal.res).to.equal(BigInt(txIndex * 2));
    });

    it("transaction execute works for subsequent transactions", async function () {
      txIndex++;

      let payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      txIndex++;
      // submit another transaction with the same multisig
      payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      const bal = await targetContract.call("get_balance");
      expect(bal.res).to.equal(BigInt(txIndex * 2));
    });

    it("transaction with complex arguments work", async function () {
      txIndex++;

      const selector = number.toBN(getSelectorFromName("complex_inputs"));
      const target = number.toBN(targetContract.address);
      const simpleArray = [1, 2, 3];
      const structArrayData = [
        { first: 4, second: 5 },
        { first: 6, second: 7 },
      ];
      let empty: any[] = [];
      var structArray = empty.concat(
        ...structArrayData.map((i) => Object.values(i))
      );

      // Calldata has 1) a simple number array 2) an array with struct elements containing numbers
      const calldata = [
        simpleArray.length,
        ...simpleArray,
        structArrayData.length,
        ...structArray,
      ];
      const payload = {
        to: target,
        function_selector: selector,
        calldata: calldata,
      };

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      const bal = await targetContract.call("getArraySum");
      const sum = simpleArray
        .concat(Object.values(structArrayData[0]))
        .concat(Object.values(structArrayData[1]))
        .reduce((a, b) => a + b, 0);

      expect(bal.res).to.equal(BigInt(sum));
    });

    it("transaction execute fails if no confirmations", async function () {
      txIndex++;

      const payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);

      try {
        await account.invoke(multisig, "execute_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "need more confirmations");
      }
    });

    it("non-owner can't submit a transaction", async function () {
      const payload = defaultPayload(targetContract.address, txIndex * 2);

      try {
        await nonOwner.invoke(multisig, "submit_transaction", payload);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not owner");
      }
    }); */
  });
  /* 
  describe("- confirmation - ", function () {
    it("non-owner can't confirm a transaction", async function () {
      txIndex++;

      const payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);

      try {
        await nonOwner.invoke(multisig, "confirm_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not owner");
      }
    });

    it("can't confirm a non-existing transaction", async function () {
      try {
        await account.invoke(multisig, "confirm_transaction", {
          tx_index: txIndex + 500,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx does not exist");
      }
    });

    it("can't confirm an executed transaction", async function () {
      txIndex++;

      const payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "confirm_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx already executed");
      }
    });

    it("can't reconfirm a transaction", async function () {
      txIndex++;

      const payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "confirm_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx already confirmed");
      }
    });
  });

  describe("- revocation -", function () {
    it("non-owner can't revoke a confirmation", async function () {
      txIndex++;

      const payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      try {
        await nonOwner.invoke(multisig, "revoke_confirmation", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not owner");
      }
    });

    it("can't revoke a confirmation for a non-existing transaction", async function () {
      try {
        await account.invoke(multisig, "revoke_confirmation", {
          tx_index: txIndex + 500,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx does not exist");
      }
    });

    it("can't revoke a confirmation for an executed transaction", async function () {
      txIndex++;

      const payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "revoke_confirmation", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx already executed");
      }
    });

    it("can't re-revoke an already revoked transaction confirmation", async function () {
      txIndex++;

      const payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      await account.invoke(multisig, "revoke_confirmation", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "revoke_confirmation", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx not confirmed");
      }
    });
  });

  describe("- execution -", function () {
    it("non-owner can't execute a transaction", async function () {
      txIndex++;

      const payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      try {
        await nonOwner.invoke(multisig, "execute_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not owner");
      }
    });

    it("can't execute a non-existing transaction", async function () {
      try {
        await account.invoke(multisig, "execute_transaction", {
          tx_index: txIndex + 500,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx does not exist");
      }
    });

    it("can't re-execute a transaction", async function () {
      txIndex++;

      const payload = defaultPayload(targetContract.address, txIndex * 2);
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx already executed");
      }
    });
  }); */
});

/* describe("Multisig with multiple owners", function () {
  this.timeout(300_000);

  let targetFactory: StarknetContractFactory;
  let targetContract: StarknetContract;
  let multisig: StarknetContract;

  let account1: Account;
  let account2: Account;
  let account3: Account;

  let txIndex = -1; // faster to track this internally than to request from contract

  before(async function () {
    account1 = await starknet.deployAccount("OpenZeppelin");
    account2 = await starknet.deployAccount("OpenZeppelin");
    account3 = await starknet.deployAccount("OpenZeppelin");

    let multisigFactory = await starknet.getContractFactory("Multisig");
    multisig = await multisigFactory.deploy({
      owners: [
        number.toBN(account1.starknetContract.address),
        number.toBN(account2.starknetContract.address),
        number.toBN(account3.starknetContract.address),
      ],
      confirmations_required: 2,
    });

    targetFactory = await starknet.getContractFactory("Target");
    targetContract = await targetFactory.deploy();

    console.log("Deployment done");
    console.log("Account1: " + account1.starknetContract.address);
    console.log("Account2: " + account2.starknetContract.address);
    console.log("Account3: " + account3.starknetContract.address);
  });

  it("transaction execute works", async function () {
    txIndex++;

    const payload = defaultPayload(targetContract.address, txIndex * 2);
    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account1.invoke(multisig, "execute_transaction", {
      tx_index: txIndex,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(txIndex * 2));
  });

  it("transaction execute works with too many confirmations", async function () {
    txIndex++;

    const payload = defaultPayload(targetContract.address, txIndex * 2);
    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account1.invoke(multisig, "execute_transaction", {
      tx_index: txIndex,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(txIndex * 2));
  });

  it("transaction execute works if superfluous confirmer revokes confirmation", async function () {
    txIndex++;

    const payload = defaultPayload(targetContract.address, txIndex * 2);
    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "revoke_confirmation", {
      tx_index: txIndex,
    });
    await account1.invoke(multisig, "execute_transaction", {
      tx_index: txIndex,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(txIndex * 2));
  });

  it("transaction fails if too many revoke confirmation", async function () {
    txIndex++;

    const payload = defaultPayload(targetContract.address, txIndex * 2);
    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "revoke_confirmation", {
      tx_index: txIndex,
    });
    await account1.invoke(multisig, "revoke_confirmation", {
      tx_index: txIndex,
    });

    try {
      await account3.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });
      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(err.message, "need more confirmations");
    }
  });
}); */

const defaultPayload = (contractAddress: string, newValue: number) => {
  const setSelector = number.toBN(getSelectorFromName("set_balance"));
  const target = number.toBN(contractAddress);
  const setPayload = {
    to: target,
    function_selector: setSelector,
    calldata: [newValue],
  };
  return setPayload;
};

const assertErrorMsg = (full: string, expected: string) => {
  expect(full).to.deep.contain("Transaction rejected. Error message:");
  const match = /Error message: (.+?)\n/.exec(full);
  if (match && match.length > 1) {
    expect(match[1]).to.equal(expected);
    return;
  }
  expect.fail("No expected error found: " + expected);
};

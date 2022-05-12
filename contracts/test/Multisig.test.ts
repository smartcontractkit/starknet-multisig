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
  let privateKey: number = 12345;
  let publicKey: string;

  let txIndex = -1; // faster to track this internally than to request from contract

  const kp = starkwareCrypto.ec.keyFromPrivate([privateKey]);
  publicKey = ec.getStarkKey(kp);

  // should be beforeeach, but that'd be horribly slow. Just remember that the tests are not idempotent
  before(async function () {
    await starknet.devnet.restart();

    console.log("Deployment Tx - Account Contract to StarkNet...");

    const targetContractFactory = await starknet.getContractFactory(
      "contracts/multisig/mock/Target"
    );
    targetContract = await targetContractFactory.deploy(
      {}
      //{ salt: "0x1" }
    );

    console.log("target adddress", targetContract.address);

    const accountContractFactory = await starknet.getContractFactory(
      "contracts/account/Account"
    );
    accountContract = await accountContractFactory.deploy(
      {
        owners: [number.toBN(publicKey)],
        confirmations_required: 1,
      }
      // { salt: "0x1" }
    );
    //
    console.log("Deployed account at ", accountContract.address);
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

      const messageHash = starkwareCrypto.pedersen(["0", "8"]);

      const signature = ec.sign(kp, messageHash);
      const selector = number.toBN(getSelectorFromName("set_balance"));

      const innerCalldata = [
        number.toBN(targetContract.address),
        selector,
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

      const res = await accountContract.call("get_transaction", {
        tx_index: txIndex,
      });
      console.log("getting", res.tx.to, res.tx.to.toString());
      expect(res.tx.to.toString()).to.equal(
        number.hexToDecimalString(targetContract.address)
      );
      expect(res.tx.function_selector.toString()).to.equal(selector.toString());
      expect(res.tx.calldata_len).to.equal(1n);
      expect(res.tx.executed).to.equal(0n);
      expect(res.tx.num_confirmations).to.equal(0n);
      expect(res.tx_calldata_len).to.equal(1n);
      expect(res.tx_calldata[0]).to.equal(8n);
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

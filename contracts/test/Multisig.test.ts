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
  KeyPair,
} from "starknet";
import { transformCallsToMulticallArrays } from "starknet/dist/utils/transaction";
import { getSelectorFromName } from "starknet/dist/utils/hash";
import fs from "fs";
import * as starkwareCrypto from "@toruslabs/starkware-crypto";

describe("Multisig with single owner", function () {
  this.timeout(3000_000);

  let targetContract: StarknetContract;
  let accountContract: StarknetContract;

  let txIndex = -1; // faster to track this internally than to request from contract
  let nonce = -1; // faster to track this internally than to request from contract

  const signer1Kp = starkwareCrypto.ec.keyFromPrivate([12345]);
  const nonSignerKp = starkwareCrypto.ec.keyFromPrivate([7654]);

  const setBalSelector = number.toBN(getSelectorFromName("set_balance"));

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
        owners: [number.toBN(ec.getStarkKey(signer1Kp))],
        confirmations_required: 1,
      }
      // { salt: "0x1" }
    );

    console.log("Deployed account at ", accountContract.address);
  });

  const submit = async (keypair: KeyPair, targetValue: number) => {
    nonce++;
    const messageHash = calcHash([targetValue.toString()]);
    const signature = ec.sign(keypair, messageHash);

    const innerCalldata = [
      number.toBN(targetContract.address),
      setBalSelector,
      1,
      targetValue,
      number.toBN(ec.getStarkKey(keypair)),
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
      nonce: nonce,
    };

    try {
      await accountContract.invoke("__execute__", calldata);
    } catch (err) {
      nonce--;
      throw err;
    }
  };

  const confirmExecute = async (
    keypair: KeyPair,
    txIndex: number,
    isExecute: boolean
  ) => {
    nonce++;
    const messageHash = calcHash([txIndex.toString()]);

    const signature = ec.sign(keypair, messageHash);
    let func = "confirm_transaction";
    if (isExecute) {
      func = "execute_transaction";
    }

    const innerCalldata = [
      txIndex,
      number.toBN(ec.getStarkKey(keypair)),
      number.toBN(signature[0]),
      number.toBN(signature[1]),
    ];

    const calldata = {
      call_array: [
        {
          to: number.toBN(accountContract.address),
          selector: number.toBN(getSelectorFromName(func)),
          data_offset: 0,
          data_len: innerCalldata.length,
        },
      ],
      calldata: innerCalldata,
      nonce: nonce,
    };
    try {
      await accountContract.invoke("__execute__", calldata);
    } catch (err) {
      nonce--;
      throw err;
    }
  };

  const calcHash = (pars: string[]) => {
    const res = pars.reduce((prev, curr) => hash.pedersen([prev, curr]), "0");
    return res;
  };

  describe(" - submit - ", function () {
    it("transaction submit works", async function () {
      txIndex++;

      await submit(signer1Kp, 8);

      const res = await accountContract.call("get_transaction", {
        tx_index: txIndex,
      });

      expect(res.tx.to.toString()).to.equal(
        number.hexToDecimalString(targetContract.address)
      );
      expect(res.tx.function_selector.toString()).to.equal(
        setBalSelector.toString()
      );
      expect(res.tx.calldata_len).to.equal(1n);
      expect(res.tx.executed).to.equal(0n);
      expect(res.tx.num_confirmations).to.equal(0n);
      expect(res.tx_calldata_len).to.equal(1n);
      expect(res.tx_calldata[0]).to.equal(8n);
    });

    it("transaction execute works", async function () {
      txIndex++;

      await submit(signer1Kp, 9);
      await confirmExecute(signer1Kp, txIndex, false);
      await confirmExecute(signer1Kp, txIndex, true);

      const bal = await targetContract.call("get_balance");
      expect(bal.res).to.equal(9n);
    });

    it("transaction execute works for subsequent transactions", async function () {
      txIndex++;

      await submit(signer1Kp, txIndex * 2);
      await confirmExecute(signer1Kp, txIndex, false);
      await confirmExecute(signer1Kp, txIndex, true);

      txIndex++;
      // submit another transaction with the same multisig
      await submit(signer1Kp, txIndex * 2);
      await confirmExecute(signer1Kp, txIndex, false);
      await confirmExecute(signer1Kp, txIndex, true);

      const bal = await targetContract.call("get_balance");
      expect(bal.res).to.equal(BigInt(txIndex * 2));
    });

    it("transaction with complex arguments work", async function () {
      txIndex++;

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
      const targetCalldata = [
        simpleArray.length,
        ...simpleArray,
        structArrayData.length,
        ...structArray,
      ];

      const messageHash = calcHash(targetCalldata);
      const signature = ec.sign(signer1Kp, messageHash);

      const innerCalldata = [
        number.toBN(targetContract.address),
        number.toBN(getSelectorFromName("complex_inputs")),
        targetCalldata.length,
        ...targetCalldata,
        number.toBN(ec.getStarkKey(signer1Kp)),
        number.toBN(signature[0]),
        number.toBN(signature[1]),
      ];

      nonce++;
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
        nonce: nonce,
      };

      await accountContract.invoke("__execute__", calldata);
      await confirmExecute(signer1Kp, txIndex, false);
      await confirmExecute(signer1Kp, txIndex, true);

      const sum = simpleArray
        .concat(Object.values(structArrayData[0]))
        .concat(Object.values(structArrayData[1]))
        .reduce((a, b) => a + b, 0);

      const bal = await targetContract.call("getArraySum");

      expect(bal.res).to.equal(BigInt(sum));
    });

    it("transaction execute fails if no confirmations", async function () {
      txIndex++;

      await submit(signer1Kp, 9);

      try {
        await confirmExecute(signer1Kp, txIndex, true);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "need more confirmations");
      }
    });

    it("non-signer can't submit a transaction", async function () {
      try {
        await submit(nonSignerKp, 9);
        expect.fail("Should have failed");
      } catch (err: any) {
        console.log("error", err);
        assertErrorMsg(err.message, "not owner");
      }
    });
  });

  describe("- confirmation - ", function () {
    it("non-signer can't confirm a transaction", async function () {
      txIndex++;

      await submit(signer1Kp, txIndex * 2);

      try {
        await confirmExecute(nonSignerKp, txIndex, false);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not owner");
      }
    });

    it("can't confirm a non-existing transaction", async function () {
      try {
        await confirmExecute(signer1Kp, txIndex + 500, false);
        expect.fail("Should have failed");
      } catch (err: any) {
        console.log("error", err);
        assertErrorMsg(err.message, "tx does not exist");
      }
    });

    it("can't confirm an executed transaction", async function () {
      txIndex++;

      await submit(signer1Kp, txIndex * 2);
      await confirmExecute(signer1Kp, txIndex, false);
      await confirmExecute(signer1Kp, txIndex, true);

      try {
        await confirmExecute(signer1Kp, txIndex, false);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx already executed");
      }
    });

    it("can't reconfirm a transaction", async function () {
      txIndex++;

      await submit(signer1Kp, txIndex * 2);
      await confirmExecute(signer1Kp, txIndex, false);

      try {
        await confirmExecute(signer1Kp, txIndex, false);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx already confirmed");
      }
    });
  });
  /*
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

import { number } from "starknet";
import { getSelectorFromName } from "starknet/dist/utils/hash";

const getSel = (str: string) => {
  const bn = number.toBN(getSelectorFromName(str));
  return bn.toString();
};
console.log("selector", getSel("multisig_execute_transaction"));

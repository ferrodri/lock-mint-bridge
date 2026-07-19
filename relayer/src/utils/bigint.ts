// JSON has no native BigInt: `JSON.stringify(123n)` throws. pg's JSONB encoder calls
// JSON.stringify under the hood, so any object that transitively contains a BigInt (e.g. viem's
// TransactionReceipt with its blockNumber/gasUsed/effectiveGasPrice fields) blows up on insert.
//
// Installing BigInt.prototype.toJSON once makes JSON.stringify emit BigInts as decimal strings
// (precision preserved, unlike JSON numbers which JSON.parse would clip past MAX_SAFE_INTEGER).
// Safe to call multiple times; the assignment is idempotent.
export function installBigIntJsonSerializer(): void {
  (BigInt.prototype as { toJSON?: () => string }).toJSON = function () {
    return this.toString();
  };
}

import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.8.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';
const FEE_MANAGER = "fee-manager";

const ERRORS = {
    err_owner_only: "u100",
    err_fee_too_high: "u101",
}

const setFeeRecipient = (chain: Chain, deployer: Account, recipient: Account) => {
    return chain.mineBlock([
      Tx.contractCall(
        FEE_MANAGER,
        "set-fee-recipient",
        [types.principal(recipient.address)],
        deployer.address
      ),
    ]);
  }
  
  const setFee = (chain: Chain, deployer: Account, amount: number) => {
    return chain.mineBlock([
      Tx.contractCall(
        FEE_MANAGER,
        "set-fee",
        [types.uint(amount)],
        deployer.address
      ),
    ]);
  }
  
  const transferOwnership = (chain: Chain, deployer: Account, receiver: Account) => {
    return chain.mineBlock([
      Tx.contractCall(
        FEE_MANAGER,
        "transfer-ownership",
        [types.principal(receiver.address)],
        deployer.address
      ),
    ]);
  }
  

  Clarinet.test({
    name: "Transfers ownership",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const memberB = accounts.get("wallet_1")!;

      transferOwnership(chain, deployer, memberB);
      const err1 = setFee(chain, deployer, 1000);
      const err2 = setFeeRecipient(chain, deployer, memberB);
      assertEquals(err1.receipts[0].result.expectErr(), ERRORS.err_owner_only);
      assertEquals(err2.receipts[0].result.expectErr(), ERRORS.err_owner_only);
    },
});

Clarinet.test({
    name: "Sets fee and receiver",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const memberB = accounts.get("wallet_1")!;

      setFee(chain, deployer, 100000000);
      setFeeRecipient(chain, deployer, memberB);
      
      const receipt1 = chain.callReadOnlyFn(
          FEE_MANAGER,
          "calculate-platform-fee",
          [types.uint(1000)],
          deployer.address
      );
      assertEquals(receipt1.result.expectOk(), "u10");
      
      const receipt2 = chain.callReadOnlyFn(
          FEE_MANAGER,
          "get-fee-recipient",
          [],
          deployer.address
      );
      assertEquals(receipt2.result.expectOk(), memberB.address);
    },
});


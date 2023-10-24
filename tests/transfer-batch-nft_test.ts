import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.8.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

const nftTest = "nft-test";
const transferBatchNft = "batch-nft-transfer";

const mintNft = (chain: Chain, deployer: Account, receiver: string) => {
  return chain.mineBlock([
    Tx.contractCall(
      `${deployer.address}.${nftTest}`,
        "mint",
      [types.principal(receiver)],
      deployer.address
    ),
  ]);
}


Clarinet.test({
    name: "Allows to send batch nfts",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const memberB = accounts.get("wallet_1")!;
      mintNft(chain, deployer, deployer.address);
      mintNft(chain, deployer, deployer.address);

      const tx = chain.mineBlock([
        Tx.contractCall(
          transferBatchNft,
          "batch-nft-transfer",
          [types.principal(memberB.address), types.principal(`${deployer.address}.${nftTest}`), types.list([types.uint(1), types.uint(2)])],
          deployer.address
        ),
      ]);
      assertEquals(tx.receipts[0].events.length, 2);
      assertEquals(tx.receipts[0].events[0].nft_transfer_event.sender, deployer.address);
      assertEquals(tx.receipts[0].events[0].nft_transfer_event.recipient, memberB.address);
      assertEquals(tx.receipts[0].events[0].nft_transfer_event.value, 'u1');
      assertEquals(tx.receipts[0].events[1].nft_transfer_event.sender, deployer.address);
      assertEquals(tx.receipts[0].events[1].nft_transfer_event.recipient, memberB.address);
      assertEquals(tx.receipts[0].events[1].nft_transfer_event.value, 'u2');

      const errorTx = chain.mineBlock([
        Tx.contractCall(
          transferBatchNft,
          "batch-nft-transfer",
          [types.principal(memberB.address), types.principal(`${deployer.address}.${nftTest}`), types.list([types.uint(1), types.uint(2)])],
          deployer.address
        ),
      ]);
      assertEquals(errorTx.receipts[0].result.expectErr(), "u2999");
    },
});

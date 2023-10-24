import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.8.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

const FT_NONE = "ft-none";
const FT_TEST = "ft-test";
const STREAMING_WALLET = "streaming-wallet";

const START_BLOCK = types.uint(2);
const DURATION = types.uint(10);
const AMOUNT = types.uint(1000000);
const DEFAULT_FEE = 50000000;
const FEE_DIVIDER = 10000000000;

const ERRORS = {
    err_beneficiary_only: "u104",
    err_stx_transfer: "u118",
    err_cancelled: "u109",
}
const STREAM_ACTIONS = {
    pause: "pause-stream",
    cancel: "cancel-stream",
    resume: "resume-stream"
}


const checkClaimInfo = (chain: Chain, deployer: any, expectedResult: string) => {
  const receipt = chain.callReadOnlyFn(
    STREAMING_WALLET,
    "get-claim-info-at",
    [types.uint(0)],
    deployer.address
  );
  assertEquals(receipt.result, expectedResult);
}

const claim = (chain: Chain, deployer: Account, tokenPrincipal: string) => {
  return chain.mineBlock([
    Tx.contractCall(
      STREAMING_WALLET,
      "claim-stream",
      [types.uint(0), types.principal(tokenPrincipal)],
      deployer.address
    ),
  ]);
}

const withdrawToken = (chain: Chain, deployer: Account, amount: number, tokenPrincipal: string) => {
  return chain.mineBlock([
    Tx.contractCall(
      STREAMING_WALLET,
      "request-withdrawal",
      [types.principal(tokenPrincipal), types.principal(deployer.address), types.uint(amount)],
      deployer.address
    ),
  ]);
}

const withdrawSTX = (chain: Chain, deployer: Account, amount: number) => {
  return chain.mineBlock([
    Tx.contractCall(
      STREAMING_WALLET,
      "request-withdrawal-stx",
      [types.uint(amount), types.principal(deployer.address)],
      deployer.address
    ),
  ]);
}

const streamAction = (chain: Chain, deployer: Account, action: string) => {
  return chain.mineBlock([
    Tx.contractCall(
      STREAMING_WALLET,
      action,
      [types.uint(0)],
      deployer.address
    ),
  ]);
}

const deposit = (chain: Chain, deployer: Account, amount: number) => {
  return chain.mineBlock([
    Tx.contractCall(
      STREAMING_WALLET,
      "deposit",
      [types.uint(amount)],
      deployer.address
    ),
  ]);
}

const depositToken = (chain: Chain, deployer: Account, amount: number, receiver: string) => {
  return chain.mineBlock([
    Tx.contractCall(
        FT_TEST,
        "mint",
      [types.uint(amount), types.principal(receiver)],
      deployer.address
    ),
  ]);
}

const createStreamPay = (chain: Chain, deployer: Account, receiver: Account, tokenPrincipal: string, isSTX: boolean) => {
    return chain.mineBlock([
      Tx.contractCall(
        STREAMING_WALLET,
        "create-stream",
        [types.principal(receiver.address), types.buff("Stream name"), START_BLOCK, DURATION, AMOUNT, types.principal(tokenPrincipal), types.bool(isSTX)],
        deployer.address
      ),
    ]);
}

const checkFtClaimEvent = (block: any, amount: number, receiver: string, feeReceiver: string) => {
  assertEquals(block.receipts[0].events[0].ft_transfer_event.amount, amount.toString());
  assertEquals(block.receipts[0].events[1].ft_transfer_event.amount, Math.round(amount * DEFAULT_FEE / FEE_DIVIDER).toString());
  assertEquals(block.receipts[0].events[0].ft_transfer_event.recipient, receiver);
  assertEquals(block.receipts[0].events[1].ft_transfer_event.recipient, feeReceiver);
}

const checkStxClaimEvent = (block: any, amount: number, receiver: string, feeReceiver: string) => {
  assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, amount.toString());
  assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, Math.round(amount * DEFAULT_FEE / FEE_DIVIDER).toString());
  assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, receiver);
  assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, feeReceiver);
}

Clarinet.test({
    name: "Allows the contract owner to create stream payment",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const memberB = accounts.get("wallet_1")!;
      const ftNonePrincipal = `${deployer.address}.${FT_NONE}`;

      const block = createStreamPay(chain, deployer, memberB, ftNonePrincipal, true);
      assertEquals(block.receipts[0].result.expectOk(), "u0");
    },
});

Clarinet.test({
    name: "Checks allowed tokens to claim",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const memberB = accounts.get("wallet_1")!;
      const ftNonePrincipal = `${deployer.address}.${FT_NONE}`;

      let block = createStreamPay(chain, deployer, memberB, ftNonePrincipal, true);

      checkClaimInfo(chain, deployer, "u0");
      chain.mineEmptyBlockUntil(2);
      checkClaimInfo(chain, deployer, "u0");
      chain.mineEmptyBlockUntil(7);
      checkClaimInfo(chain, deployer, "u500000");
      chain.mineEmptyBlockUntil(12);
      checkClaimInfo(chain, deployer, AMOUNT);


      block = claim(chain, deployer, ftNonePrincipal);
      assertEquals(block.receipts[0].result.expectErr(), ERRORS.err_beneficiary_only);

      block = claim(chain, memberB, ftNonePrincipal);
      assertEquals(block.receipts[0].result.expectErr(), ERRORS.err_stx_transfer);

      deposit(chain, deployer, 10000000);
      block = claim(chain, memberB, ftNonePrincipal);
      assertEquals(block.receipts[0].result.expectOk(), "true");

      checkClaimInfo(chain, deployer, "u0");
      chain.mineEmptyBlockUntil(24);
      checkClaimInfo(chain, deployer, "u0");
    },
});


Clarinet.test({
    name: "Checks partial claims",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const memberB = accounts.get("wallet_1")!;
      const ftNonePrincipal = `${deployer.address}.${FT_NONE}`;

      let block = createStreamPay(chain, deployer, memberB, ftNonePrincipal , true);

      chain.mineEmptyBlockUntil(6);

      deposit(chain, deployer, 10000000);
      block = claim(chain, memberB, ftNonePrincipal);
      checkStxClaimEvent(block, 500000, memberB.address, deployer.address);

      chain.mineEmptyBlockUntil(20);
      checkClaimInfo(chain, deployer, "u500000");
      block = claim(chain, memberB, ftNonePrincipal);
      checkStxClaimEvent(block, 500000, memberB.address, deployer.address);
    },
});


Clarinet.test({
    name: "Checks partial claims TOKEN",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const memberB = accounts.get("wallet_1")!;
      const ftTestPrincipal = `${deployer.address}.${FT_TEST}`;

      let block = createStreamPay(chain, deployer, memberB, ftTestPrincipal , false);

      chain.mineEmptyBlockUntil(6);


      depositToken(chain, deployer, 10000000, `${deployer.address}.${STREAMING_WALLET}`);
      block = claim(chain, memberB, ftTestPrincipal);
      checkFtClaimEvent(block, 500000, memberB.address, deployer.address);

      chain.mineEmptyBlockUntil(20);
      checkClaimInfo(chain, deployer, "u500000");
      block = claim(chain, memberB, ftTestPrincipal);
      checkFtClaimEvent(block, 500000, memberB.address, deployer.address);
    },
});


Clarinet.test({
    name: "Checks stream stopping and resuming",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const memberB = accounts.get("wallet_1")!;
      const ftNonePrincipal = `${deployer.address}.${FT_NONE}`;

      let block = createStreamPay(chain, deployer, memberB, ftNonePrincipal, true);

      chain.mineEmptyBlockUntil(7);
      streamAction(chain, deployer, STREAM_ACTIONS.pause);

      checkClaimInfo(chain, deployer, "u500000");
      chain.mineEmptyBlockUntil(20);
      checkClaimInfo(chain, deployer, "u500000");

      deposit(chain, deployer, 10000000);
      block = claim(chain, memberB, ftNonePrincipal);
      checkStxClaimEvent(block, 500000, memberB.address, deployer.address);
      checkClaimInfo(chain, deployer, "u0");

      streamAction(chain, deployer, STREAM_ACTIONS.resume);
      checkClaimInfo(chain, deployer, "u500000");

      block = claim(chain, memberB, ftNonePrincipal);
      checkStxClaimEvent(block, 500000, memberB.address, deployer.address);
    },
});


Clarinet.test({
    name: "Checks stream cancelling",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const memberB = accounts.get("wallet_1")!;
        const ftNonePrincipal = `${deployer.address}.${FT_NONE}`;

        let block = createStreamPay(chain, deployer, memberB, ftNonePrincipal, true);

        chain.mineEmptyBlockUntil(7);
        streamAction(chain, deployer, STREAM_ACTIONS.cancel);

        checkClaimInfo(chain, deployer, "u500000");
        chain.mineEmptyBlockUntil(20);
        checkClaimInfo(chain, deployer, "u500000");

        deposit(chain, deployer, 10000000);
        block = claim(chain, memberB, ftNonePrincipal);
        checkStxClaimEvent(block, 500000, memberB.address, deployer.address);
        checkClaimInfo(chain, deployer, "u0");

        block = streamAction(chain, deployer, STREAM_ACTIONS.resume);
        assertEquals(block.receipts[0].result.expectErr(), ERRORS.err_cancelled);
        block = streamAction(chain, deployer, STREAM_ACTIONS.pause);
        assertEquals(block.receipts[0].result.expectErr(), ERRORS.err_cancelled);
    },
});


Clarinet.test({
    name: "Checks Token withdrawals",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const memberB = accounts.get("wallet_1")!;
        const ftTestPrincipal = `${deployer.address}.${FT_TEST}`;
        depositToken(chain, deployer, 1000, `${deployer.address}.${STREAMING_WALLET}`);

        let block = withdrawToken(chain, deployer, 500, ftTestPrincipal);
        assertEquals(block.receipts[0].events[0].ft_transfer_event.amount, "500");

        block = withdrawToken(chain, deployer, 500, ftTestPrincipal);
        assertEquals(block.receipts[0].events[0].ft_transfer_event.amount, "500");
    },
});


Clarinet.test({
    name: "Checks STX withdrawals",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const memberB = accounts.get("wallet_1")!;
        const ftNonePrincipal = `${deployer.address}.${FT_NONE}`;
        deposit(chain, deployer, 1000);

        let block = withdrawSTX(chain, deployer, 500);
        assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, "500");
        block = withdrawSTX(chain, deployer, 500);
        assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, "500");
    },
});

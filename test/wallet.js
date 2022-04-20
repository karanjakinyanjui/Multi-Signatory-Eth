const { expectRevert } = require("@openzeppelin/test-helpers");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");

const Wallet = artifacts.require("Wallet");

const getBalance = async (address) => {
  return web3.utils.toBN(await web3.eth.getBalance(address));
};
contract("Wallet", (accounts) => {
  let wallet;
  beforeEach(async () => {
    wallet = await Wallet.new(accounts.slice(0, 3), 2);
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: wallet.address,
      value: 1000,
    });
  });
  it("should have correct approvers and quorum", async () => {
    const approvers = await wallet.getApprovers();
    const quorum = await wallet.quorum();

    assert(approvers.length === 3);
    assert(approvers[0] === accounts[0]);
    assert(approvers[1] === accounts[1]);
    assert(approvers[2] === accounts[2]);
    assert(quorum.toNumber() == 2);
  });
  it("should create transfers", async () => {
    await wallet.createTransfer(100, accounts[5], { from: accounts[0] });
    const transfers = await wallet.getTransfers();
    assert(transfers.length === 1);
    assert(transfers[0].id === "0");
    assert(transfers[0].amount === "100");
    assert(transfers[0].to === accounts[5]);
    assert(transfers[0].approvals === "0");
    assert(transfers[0].sent === false);
  });

  it("should NOT create transfers if sender is not approver", async () => {
    await expectRevert(
      wallet.createTransfer(100, accounts[5], { from: accounts[5] }),
      "only approvers"
    );
  });

  it("should increment approvals", async () => {
    await wallet.createTransfer(100, accounts[5], { from: accounts[0] });
    await wallet.approveTransfer(0);
    const transfers = await wallet.getTransfers();
    const balance = await getBalance(wallet.address);
    assert(transfers[0].approvals === "1");
    assert(transfers[0].sent === false);
    assert(balance.toNumber() === 1000);
  });

  it("should send transfer if quorum reached", async () => {
    const balanceBefore = await getBalance(accounts[6]);
    await wallet.createTransfer(100, accounts[6], { from: accounts[0] });
    await wallet.approveTransfer(0, { from: accounts[0] });
    await wallet.approveTransfer(0, { from: accounts[1] });
    const balanceAfter = await getBalance(accounts[6]);
    assert(balanceAfter.sub(balanceBefore).toNumber() == 100);
    const transfers = await wallet.getTransfers();
    assert(transfers[0].approvals === "2");
    assert(transfers[0].sent === true);
  });

  it("should NOT approve transfer if sender is not approver", async () => {
    await wallet.createTransfer(100, accounts[6], { from: accounts[0] });
    await expectRevert(
      wallet.approveTransfer(0, { from: accounts[5] }),
      "only approvers"
    );
  });

  it("should NOT send transfer if transfer already sent", async () => {
    const balanceBefore = await getBalance(accounts[6]);
    await wallet.createTransfer(100, accounts[6], { from: accounts[0] });
    await wallet.approveTransfer(0, { from: accounts[0] });
    await wallet.approveTransfer(0, { from: accounts[1] });
    await expectRevert(
      wallet.approveTransfer(0, { from: accounts[0] }),
      "cannot approve sent transfer"
    );
  });

  it("should NOT approve transfer twice", async () => {
    await wallet.createTransfer(100, accounts[6], { from: accounts[1] });
    await wallet.approveTransfer(0, { from: accounts[0] });
    await expectRevert(
      wallet.approveTransfer(0, { from: accounts[0] }),
      "cannot approve twice"
    );
  });
});

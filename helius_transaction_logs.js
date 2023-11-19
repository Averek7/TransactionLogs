require("dotenv").config();

const address = "6WihykNmw4aQfFr8odz9DDhfHAcMLQfpakiTWLccvGUm";

function lamportsToSOL(lamports) {
  return lamports / 10 ** 9;
}

const getMetadata = async (mintAddresses) => {
  const url = `https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mintAccounts: mintAddresses,
      includeOffChain: true,
      disableCache: false,
    }),
  });

  const data = await response.json();
  const symbolMap = {};

  data.forEach((item) => {
    const mint = item.account;
    const symbol = item.onChainMetadata?.metadata?.data?.symbol;
    if (mint && symbol) {
      symbolMap[mint] = symbol;
    }
  });

  return symbolMap;
};

const transactions = async () => {
  const url = `https://api-devnet.helius.xyz/v0/addresses/${address}/transactions?api-key=${process.env.HELIUS_API}`;
  const response = await fetch(url);
  const data = await response.json();

  const walletData = {};
  const mintAddresses = [];

  data.forEach((transaction) => {
    // Process native transfers
    transaction.nativeTransfers.forEach((nativeTransfer) => {
      const fromAccount = nativeTransfer.fromUserAccount;
      const toAccount = nativeTransfer.toUserAccount;
      const amount = lamportsToSOL(nativeTransfer.amount);

      if (!walletData[fromAccount]) {
        walletData[fromAccount] = {};
      }

      if (!walletData[toAccount]) {
        walletData[toAccount] = {};
      }

      walletData[fromAccount][toAccount] =
        (walletData[fromAccount][toAccount] || 0) + amount;
    });

    // Collect mint addresses for token transfers
    transaction.tokenTransfers.forEach((token) => {
      const mintAddress = token.mint;
      mintAddresses.push(mintAddress);
    });
  });

  // Fetch token symbols asynchronously
  const symbolMap = await getMetadata([...new Set(mintAddresses)]);

  // Process token transfers with token symbols
  data.forEach((transaction) => {
    transaction.tokenTransfers.forEach((token) => {
      const fromAccount = token.fromUserAccount;
      const toAccount = token.toUserAccount;
      const tokenAmount = token.tokenAmount;
      const mintAddress = token.mint;
      const tokenSymbol = symbolMap[mintAddress];

      if (!walletData[fromAccount]) {
        walletData[fromAccount] = {};
      }

      if (!walletData[toAccount]) {
        walletData[toAccount] = {};
      }

      walletData[fromAccount][toAccount] = {
        amount: (walletData[fromAccount][toAccount]?.amount || 0) + tokenAmount,
        symbol: tokenSymbol,
      };
    });
  });

  console.log(walletData);
};

transactions();

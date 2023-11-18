const web3 = require("@solana/web3.js");
const splToken = require("@solana/spl-token");

const searchAddress = "8dmgyxyDdRdf5vYYDcMcVA9YFbPXBNCRCMJrVm2Q9PhC";
const solanaConnection = new web3.Connection(web3.clusterApiUrl('devnet'), "confirmed");
const walletData = {};

const getTransaction = async (searchAddress) => {
  try {
    const pubKey = new web3.PublicKey(searchAddress);

    // Fetch SOL transfers
    const solTransfers = await solanaConnection.getConfirmedSignaturesForAddress2(pubKey, {limit: 10});
    const solTransactionDetails = await solanaConnection.getParsedTransactions(solTransfers.map(sig => sig.signature));

    solTransfers.forEach((solTransfer, index) => {
      const date = new Date(solTransfer.blockTime * 1000);

      // Iterate through all instructions
      solTransactionDetails[index].transaction.message.instructions.forEach((instruction) => {
        if (instruction.programId.equals(web3.SystemProgram.programId)) {
          // Check for SOL transfers
          const lamports = instruction.parsed.info.lamports;

          if (!walletData[searchAddress]) {
            walletData[searchAddress] = {};
          }

          walletData[searchAddress]["sol"] = (walletData[searchAddress]["sol"] || 0) + lamports / web3.LAMPORTS_PER_SOL;
        } else {
          console.log(`Program ID: ${instruction.programId.toBase58()}`);
        }
      });
    });

    // Fetch SPL Token transfers
    const tokenAccounts = await solanaConnection.getParsedProgramAccounts(
      splToken.TOKEN_PROGRAM_ID,
      {
        filters: [
          {
            dataSize: 165,
          },
          {
            memcmp: {
              offset: 32,
              bytes: searchAddress,
            },
          },
        ],
      }
    );

    tokenAccounts.forEach((account) => {
      const tokenAmount = account.account.data.parsed.info.tokenAmount;

      if (!walletData[searchAddress]) {
        walletData[searchAddress] = {};
      }

      walletData[searchAddress]["Token"] = (walletData[searchAddress]["Token"] || 0) + tokenAmount.uiAmount;
    });
    console.log("Wallet Data:", walletData);

  } catch (error) {
    console.error("Error:", error);
  }
};

getTransaction(searchAddress);

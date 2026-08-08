const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

// This is the private key of the TEE Signer registered in CredRegistry!
// It matches the deployer's wallet address that we used for coston2 deployment.
const TEE_PRIVATE_KEY = "0x3bb9684ddec05d7be9aff5f3482bbbb6294ff6b0e585701d6d9419ca93078991";
const wallet = new ethers.Wallet(TEE_PRIVATE_KEY);

app.post("/direct", async (req, res) => {
    try {
        console.log("🔒 [TEE] Received private computation request:");
        console.log(req.body);

        const { userAddress, accountAgeDays, totalTransactions, monthlyVolumeUsd } = req.body;

        if (!userAddress) {
            throw new Error("Missing userAddress in payload");
        }

        // Perform the "Private Computation"
        // This simulates the Go enclave calculating the credit score based on private inputs.
        let score = 300;
        if (accountAgeDays > 365) score += 200;
        if (totalTransactions > 50) score += 200;
        if (monthlyVolumeUsd > 5000) score += 150;
        
        console.log(`✅ [TEE] Computed Credit Score: ${score}`);

        // Encode the result as JSON string, exactly like the Go enclave does
        const payloadJson = JSON.stringify({ score });
        const resultBytes = ethers.toUtf8Bytes(payloadJson);
        const encodedResult = ethers.hexlify(resultBytes);

        // Sign the hash of the JSON bytes (the frontend passes these bytes to the contract)
        const messageHash = ethers.keccak256(encodedResult);

        // Sign the hash (ethers handles the \x19Ethereum Signed Message:\n32 prefix)
        const signature = await wallet.signMessage(ethers.getBytes(messageHash));
        
        console.log(`✍️  [TEE] Signed result: ${signature}`);

        res.json({
            status: "success",
            // Return resultData instead of result so the frontend parses it properly
            resultData: encodedResult,
            signature: signature
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 6674;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Flare Local TEE Proxy is running!`);
    console.log(`Listening on http://localhost:${PORT}`);
    console.log(`=========================================`);
    console.log(`Ready to sign private computations...`);
});

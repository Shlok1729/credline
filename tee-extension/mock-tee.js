const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

// This is the private key of the TEE Signer registered in CredRegistry!
// We generated a fresh wallet specifically for this TEE to separate it from the deployer.
const TEE_PRIVATE_KEY = "0x2880fc9777adcd46fcae0a0aa73aef4d06cc443492a5fbe4080a3a3643f5496f";
const wallet = new ethers.Wallet(TEE_PRIVATE_KEY);

app.post("/direct", async (req, res) => {
    try {
        console.log("🔒 [TEE] Received private computation request:");
        console.log(req.body);

        const { userAddress, accountAgeDays, totalTransactions, monthlyVolumeUsd, activeMonths = 0 } = req.body;

        if (!userAddress) {
            throw new Error("Missing userAddress in payload");
        }

        // Perform the "Private Computation"
        // This simulates the Go enclave calculating the credit score based on private inputs.
        const base = 300;
        const ageScore = Math.min((accountAgeDays / 365.0) * 100.0, 150.0);
        const volumeScore = Math.min(Math.log10(monthlyVolumeUsd + 1) * 33.3, 200.0);
        const activityScore = Math.min((activeMonths / 12.0) * 100.0, 150.0);
        const consistencyScore = Math.min((totalTransactions / 100.0) * 50.0, 50.0);

        let score = Math.round(base + ageScore + volumeScore + activityScore + consistencyScore);
        if (score < 300) score = 300;
        if (score > 850) score = 850;
        
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

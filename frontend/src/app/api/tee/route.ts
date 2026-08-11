import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const TEE_PRIVATE_KEY = "0x2880fc9777adcd46fcae0a0aa73aef4d06cc443492a5fbe4080a3a3643f5496f";
const wallet = new ethers.Wallet(TEE_PRIVATE_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userAddress, accountAgeDays, totalTransactions, monthlyVolumeUsd, activeMonths = 0 } = body;

    if (!userAddress) {
      return NextResponse.json({ error: "Missing userAddress in payload" }, { status: 400 });
    }

    const base = 300;
    const ageScore = Math.min((accountAgeDays / 365.0) * 100.0, 150.0);
    const volumeScore = Math.min(Math.log10(monthlyVolumeUsd + 1) * 33.3, 200.0);
    const activityScore = Math.min((activeMonths / 12.0) * 100.0, 150.0);
    const consistencyScore = Math.min((totalTransactions / 100.0) * 50.0, 50.0);

    let score = Math.round(base + ageScore + volumeScore + activityScore + consistencyScore);
    if (score < 300) score = 300;
    if (score > 850) score = 850;

    const payloadJson = JSON.stringify({ score });
    const resultBytes = ethers.toUtf8Bytes(payloadJson);
    const encodedResult = ethers.hexlify(resultBytes);

    const messageHash = ethers.keccak256(encodedResult);
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    return NextResponse.json({
      status: "success",
      resultData: encodedResult,
      signature: signature
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

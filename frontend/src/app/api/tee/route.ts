import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const TEE_PRIVATE_KEY = "0x2880fc9777adcd46fcae0a0aa73aef4d06cc443492a5fbe4080a3a3643f5496f";
const wallet = new ethers.Wallet(TEE_PRIVATE_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userAddress, accountAgeDays, totalTransactions, monthlyVolumeUsd } = body;

    if (!userAddress) {
      return NextResponse.json({ error: "Missing userAddress in payload" }, { status: 400 });
    }

    let score = 300;
    if (accountAgeDays > 365) score += 200;
    if (totalTransactions > 50) score += 200;
    if (monthlyVolumeUsd > 5000) score += 150;

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

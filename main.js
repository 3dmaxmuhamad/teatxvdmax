const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
    rpcUrl: process.env.RPC_URL || 'https://tea-sepolia.g.alchemy.com/public',
    privateKey: process.env.PRIVATE_KEY,
    minAmount: process.env.MIN_AMOUNT || '0.001',
    maxAmount: process.env.MAX_AMOUNT || '0.01',
    intervalMinutes: parseInt(process.env.INTERVAL_MINUTES) || 1
};

// Check .env required values
if (!CONFIG.privateKey) {
    console.error('Error: PRIVATE_KEY is required in .env file');
    process.exit(1);
}

// Read recipient addresses from address.txt
const addressFilePath = path.join(__dirname, 'address.txt');
if (!fs.existsSync(addressFilePath)) {
    console.error('Error: address.txt not found!');
    process.exit(1);
}

const addresses = fs.readFileSync(addressFilePath, 'utf8')
    .split('\n')
    .map(addr => addr.trim())
    .filter(addr => addr.length > 0);

if (addresses.length === 0) {
    console.error('Error: No addresses found in address.txt');
    process.exit(1);
}

console.log(`Loaded ${addresses.length} recipient addresses`);

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
const wallet = new ethers.Wallet(CONFIG.privateKey, provider);

// Function to get a random amount between min and max
function getRandomAmount(min, max) {
    return Math.random() * (max - min) + min;
}

// Function to send TEA tokens
async function sendTea(recipientAddress) {
    try {
        // Convert to valid address format if needed
        const toAddress = ethers.getAddress(recipientAddress);
        
        // Get random amount between min and max (in TEA)
        const amountInTea = getRandomAmount(
            parseFloat(CONFIG.minAmount),
            parseFloat(CONFIG.maxAmount)
        );
        
        // Convert to wei (1 TEA = 10^18 wei)
        const amountInWei = ethers.parseEther(amountInTea.toFixed(6));
        
        console.log(`Sending ${amountInTea.toFixed(6)} TEA to ${toAddress}`);
        
        // Create transaction
        const tx = await wallet.sendTransaction({
            to: toAddress,
            value: amountInWei
        });
        
        console.log(`Transaction sent: ${tx.hash}`);
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
        
        return true;
    } catch (error) {
        console.error(`Error sending to ${recipientAddress}:`, error.message);
        return false;
    }
}

// Main function to process all addresses
async function processAddresses() {
    console.log('Starting TEA token distribution');
    console.log(`Using RPC URL: ${CONFIG.rpcUrl}`);
    
    try {
        // Get wallet address and balance
        const address = await wallet.getAddress();
        const balance = await provider.getBalance(address);
        const balanceInTea = ethers.formatEther(balance);
        
        console.log(`Wallet address: ${address}`);
        console.log(`Wallet balance: ${balanceInTea} TEA`);
        
        // Process each address
        for (const recipientAddress of addresses) {
            await sendTea(recipientAddress);
            
            // Random delay between transactions (1-3 seconds)
            const delay = Math.floor(Math.random() * 2000) + 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.log('All transactions completed');
    } catch (error) {
        console.error('Error in main process:', error.message);
    }
}

// Run the process at specified interval
console.log(`Will run every ${CONFIG.intervalMinutes} minutes`);

// Run immediately on start
processAddresses();

// Then schedule to run at the specified interval
setInterval(processAddresses, CONFIG.intervalMinutes * 60 * 1000);

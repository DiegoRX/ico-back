const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        // Find ANY orders that are NOT pending
        const successfulOrders = await db.collection('orders').find({
            status: { $ne: 'PENDING' }
        }).sort({ updatedAt: -1 }).limit(10).toArray();

        // Find ANY txes that are processed
        const processedTxs = await db.collection('txes').find({
            status: 'processed'
        }).sort({ _id: -1 }).limit(10).toArray();

        let output = `=== SUCCESSFUL ACTIVITY AUDIT ===\n\n`;
        output += 'Non-Pending Orders:\n' + JSON.stringify(successfulOrders, null, 2) + '\n\n';
        output += 'Processed Txs:\n' + JSON.stringify(processedTxs, null, 2) + '\n\n';

        fs.writeFileSync('db_success_audit.txt', output, 'utf8');
        console.log('Audit written to db_success_audit.txt');

    } catch (err) {
        fs.writeFileSync('db_success_audit.txt', 'Error: ' + err.message, 'utf8');
    } finally {
        await mongoose.disconnect();
    }
}

run();

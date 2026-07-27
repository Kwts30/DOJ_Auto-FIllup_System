// Discord Digest generator
// LSPD / DOJ Case Filing System
// Posts scheduled reports to Discord webhooks

const { getDatabase } = require('./db');

// Using native fetch for Node 18+
async function postToDiscord(webhookUrl, payload) {
  if (!webhookUrl) {
    console.log('Discord webhook URL not configured, skipping digest.');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`Discord API returned ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to post to Discord:', error);
  }
}

async function generateCaseDigest() {
  const db = getDatabase();
  const webhookUrl = process.env.DISCORD_WEBHOOK_CASES;

  if (!webhookUrl) return;

  // Get stats for the last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [newCases, filedCases, needingRevision] = await Promise.all([
    db.collection('filings').countDocuments({ created_at: { $gte: yesterday } }),
    db.collection('filings').countDocuments({ status: 'filed', updated_at: { $gte: yesterday } }),
    db.collection('filings').countDocuments({ status: 'needs_revision' })
  ]);

  const payload = {
    embeds: [{
      title: '📋 LSPD/DA Daily Filing Digest',
      color: 0x0d2c53, // DA Blue
      description: 'Here is the summary of filing activity over the last 24 hours.',
      fields: [
        { name: 'New Filings Submitted', value: newCases.toString(), inline: true },
        { name: 'Filings Approved', value: filedCases.toString(), inline: true },
        { name: 'Currently Needing Revision', value: needingRevision.toString(), inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  await postToDiscord(webhookUrl, payload);
  console.log('Filing digest sent to Discord.');
}

async function generateAccountDigest() {
  const db = getDatabase();
  const webhookUrl = process.env.DISCORD_WEBHOOK_ACCOUNTS;

  if (!webhookUrl) return;

  const [pendingLSPD, pendingDA] = await Promise.all([
    db.collection('users').countDocuments({ account_status: 'pending', department: 'LSPD' }),
    db.collection('users').countDocuments({ account_status: 'pending', department: 'DA' })
  ]);

  if (pendingLSPD === 0 && pendingDA === 0) {
    return; // Don't send if there's no pending accounts
  }

  const payload = {
    embeds: [{
      title: '⚠️ Pending Account Approvals',
      color: 0xf59e0b, // Warning Orange
      description: 'There are new accounts waiting for administrator approval.',
      fields: [
        { name: 'LSPD Pending', value: pendingLSPD.toString(), inline: true },
        { name: 'DA Pending', value: pendingDA.toString(), inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  await postToDiscord(webhookUrl, payload);
  console.log('Account digest sent to Discord.');
}

async function notifyStatusChange(filingNumber, status, actorName, extraNote = '') {
  const webhookUrl = process.env.DISCORD_WEBHOOK_CASES;
  if (!webhookUrl) return;

  const statusColors = {
    submitted: 0x3b82f6,      // Blue
    under_review: 0x8b5cf6,   // Purple
    needs_revision: 0xf59e0b, // Amber
    filed: 0x10b981,          // Green
    dismissed: 0xef4444       // Red
  };

  const statusTitles = {
    submitted: '📥 Filing Submitted to DA',
    under_review: '🔍 Filing Under Review',
    needs_revision: '⚠️ Revision Requested',
    filed: '✅ Case Filed & Approved',
    dismissed: '❌ Case Dismissed'
  };

  const payload = {
    embeds: [{
      title: statusTitles[status] || `Filing Status Update: ${status}`,
      color: statusColors[status] || 0x6b7280,
      description: `Filing **${filingNumber}** changed to status **${status.toUpperCase()}** by **${actorName}**.${extraNote ? '\n\n' + extraNote : ''}`,
      timestamp: new Date().toISOString()
    }]
  };

  await postToDiscord(webhookUrl, payload).catch(err => console.error('Real-time Discord alert failed:', err));
}

async function notifyAccountRegistration(userData) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_ACCOUNTS || process.env.DISCORD_WEBHOOK_CASES;
  if (!webhookUrl) return;

  const payload = {
    embeds: [{
      title: '👤 New Account Registration Pending Approval',
      color: 0xf59e0b, // Amber Warning
      description: `A new officer/user application has been submitted and is pending administrator verification.`,
      fields: [
        { name: 'Username', value: userData.username || 'N/A', inline: true },
        { name: 'Full Name', value: userData.name || 'N/A', inline: true },
        { name: 'Department', value: userData.department || 'N/A', inline: true },
        { name: 'Position', value: userData.position || 'N/A', inline: true },
        { name: 'Badge Number', value: userData.badge_number || 'N/A', inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  await postToDiscord(webhookUrl, payload).catch(err => console.error('Account registration Discord alert failed:', err));
}

async function notifyAccountApproval(targetUser, adminName, isApproved, reason = '') {
  const webhookUrl = process.env.DISCORD_WEBHOOK_ACCOUNTS || process.env.DISCORD_WEBHOOK_CASES;
  if (!webhookUrl) return;

  const payload = {
    embeds: [{
      title: isApproved ? '✅ Account Verified & Approved' : '❌ Account Verification Rejected',
      color: isApproved ? 0x10b981 : 0xef4444,
      description: isApproved
        ? `Account for **${targetUser.name}** (\`${targetUser.username}\`) has been **APPROVED** by **${adminName}**. The user can now log in.`
        : `Account application for **${targetUser.name}** (\`${targetUser.username}\`) was **REJECTED** by **${adminName}**.${reason ? '\n\n**Reason:** ' + reason : ''}`,
      fields: [
        { name: 'Username', value: targetUser.username || 'N/A', inline: true },
        { name: 'Full Name', value: targetUser.name || 'N/A', inline: true },
        { name: 'Department', value: targetUser.department || 'N/A', inline: true },
        { name: 'Position', value: targetUser.position || 'N/A', inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  await postToDiscord(webhookUrl, payload).catch(err => console.error('Account approval Discord alert failed:', err));
}

module.exports = {
  generateCaseDigest,
  generateAccountDigest,
  notifyStatusChange,
  notifyAccountRegistration,
  notifyAccountApproval
};

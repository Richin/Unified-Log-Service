function checkAlerts(index, logEntry) {
    // Simple check for error status or critical levels
    const isError =
        logEntry.status === 'error' ||
        logEntry.level === 'critical' ||
        logEntry.level === 'error';

    if (isError) {
        const timestamp = new Date().toISOString();
        console.warn(`[ALERT] [${timestamp}] Critical log detected in index '${index}'!`);
        console.warn(JSON.stringify(logEntry, null, 2));

        // Here you would add code to send an email or Slack message
        // e.g., sendSlackNotification(...)
    }
}

module.exports = { checkAlerts };

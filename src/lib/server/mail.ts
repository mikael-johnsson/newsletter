// No mail provider yet: log instead of sending, so nothing reaches a real inbox.
export async function sendConfirmation(to: string, confirmUrl: string): Promise<void> {
	console.info(`[mail] Confirmation for ${to}: ${confirmUrl}`);
}

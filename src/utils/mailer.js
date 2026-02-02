

// Mailer is currently disabled. This no-op ensures booking and admin actions still work.
export async function sendMail() {
	// No-op: mailer is disabled, do nothing
	return Promise.resolve();
}
